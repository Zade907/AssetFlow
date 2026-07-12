import { EmployeeStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";
import { serializeUser } from "../../utils/serialize-user";
import { signAccessToken } from "../../middleware/auth";
import type { LoginInput, SignupInput } from "./auth.schema";

const userInclude = {
  employee: { include: { department: true } },
} satisfies Prisma.UserInclude;

function authResponse(user: Prisma.UserGetPayload<{ include: typeof userInclude }>) {
  if (!user.employee) {
    throw new AppError(403, "EMPLOYEE_PROFILE_MISSING", "This account has no employee profile");
  }

  const token = signAccessToken({
    userId: user.id,
    employeeId: user.employee.id,
    email: user.email,
    role: user.employee.role,
  });

  return {
    token,
    user: serializeUser(user),
    role: user.employee.role,
  };
}

export async function signup(input: SignupInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        employee: {
          create: {
            name: input.name,
            email: input.email,
            // Deliberately fixed: public signup can never choose or elevate its role.
            role: "EMPLOYEE",
          },
        },
      },
      include: userInclude,
    });

    return authResponse(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists");
    }
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: userInclude,
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  if (!user.employee) {
    throw new AppError(403, "EMPLOYEE_PROFILE_MISSING", "This account has no employee profile");
  }

  if (user.employee.status !== EmployeeStatus.ACTIVE) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "This employee account is inactive");
  }

  return authResponse(user);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });

  if (!user?.employee) {
    throw new AppError(404, "USER_NOT_FOUND", "The current user no longer exists");
  }

  return serializeUser(user);
}
