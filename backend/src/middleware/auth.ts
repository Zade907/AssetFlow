import { EmployeeStatus, type Role } from "@prisma/client";
import type { RequestHandler } from "express";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";

const tokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  employeeId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"]),
});

type SignablePrincipal = {
  userId: string;
  employeeId: string;
  email: string;
  role: Role;
};

export function signAccessToken(principal: SignablePrincipal): string {
  const options: SignOptions = {
    subject: principal.userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      employeeId: principal.employeeId,
      email: principal.email,
      role: principal.role,
    },
    env.JWT_SECRET,
    options,
  );
}

export function verifyAccessToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return tokenPayloadSchema.parse(decoded);
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "The access token is invalid or expired");
  }
}

export const authenticateToken: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.header("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match?.[1]) {
      throw new AppError(401, "AUTHENTICATION_REQUIRED", "A Bearer access token is required");
    }

    const claims = verifyAccessToken(match[1]);
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: {
        id: true,
        email: true,
        employee: { select: { id: true, role: true, status: true } },
      },
    });

    if (!user?.employee || user.employee.id !== claims.employeeId) {
      throw new AppError(401, "INVALID_TOKEN", "The account for this access token no longer exists");
    }

    if (user.employee.status !== EmployeeStatus.ACTIVE) {
      throw new AppError(403, "ACCOUNT_INACTIVE", "This employee account is inactive");
    }

    // Role and email come from the database so promotions/demotions take effect immediately.
    request.auth = {
      userId: user.id,
      employeeId: user.employee.id,
      email: user.email,
      role: user.employee.role,
    };
    next();
  } catch (error) {
    next(error);
  }
};
