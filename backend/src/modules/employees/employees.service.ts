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

export async function promoteEmployee(id: string, role: Role) {
  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }

  return prisma.employee.update({ where: { id }, data: { role }, select: employeeSelect });
}

export async function updateEmployeeStatus(id: string, status: EmployeeStatus) {
  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }

  return prisma.employee.update({ where: { id }, data: { status }, select: employeeSelect });
}
