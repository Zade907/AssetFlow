import type { EmployeeStatus, Prisma, Role } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";
import type { ListEmployeesQuery } from "./employees.schema";

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  departmentId: true,
  department: { select: { id: true, name: true, code: true } },
  user: { select: { id: true, email: true } },
  headOf: { select: { id: true, name: true, code: true } },
} satisfies Prisma.EmployeeSelect;

export function listEmployees(query: ListEmployeesQuery) {
  const where: Prisma.EmployeeWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return prisma.employee.findMany({ where, select: employeeSelect, orderBy: { name: "asc" } });
}

type RoleChangeActor = {
  employeeId: string;
  ipAddress?: string;
};

export async function promoteEmployee(id: string, role: Role, actor: RoleChangeActor) {
  if (id === actor.employeeId) {
    throw new AppError(403, "SELF_ROLE_CHANGE_FORBIDDEN", "Administrators cannot change their own role");
  }

  return prisma.$transaction(async (transaction) => {
    const employee = await transaction.employee.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!employee) {
      throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
    }
    if (employee.role === role) {
      throw new AppError(409, "ROLE_UNCHANGED", `${employee.name} already has this role`);
    }

    const updated = await transaction.employee.update({
      where: { id },
      data: { role },
      select: employeeSelect,
    });

    await transaction.activityLog.create({
      data: {
        employeeId: actor.employeeId,
        action: "EMPLOYEE_ROLE_CHANGED",
        entityType: "Employee",
        entityId: employee.id,
        ipAddress: actor.ipAddress,
        details: {
          targetName: employee.name,
          targetEmail: employee.email,
          previousRole: employee.role,
          newRole: role,
        },
      },
    });

    return updated;
  });
}

export async function updateEmployeeStatus(id: string, status: EmployeeStatus, actorEmployeeId: string) {
  if (id === actorEmployeeId) {
    throw new AppError(403, "SELF_STATUS_CHANGE_FORBIDDEN", "Administrators cannot change their own account status");
  }
  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }

  return prisma.employee.update({ where: { id }, data: { status }, select: employeeSelect });
}
