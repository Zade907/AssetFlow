import { EmployeeStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";
import type { CreateDepartmentInput, UpdateDepartmentInput } from "./departments.schema";

const departmentInclude = {
  parent: { select: { id: true, name: true, code: true } },
  head: { select: { id: true, name: true, email: true, role: true, status: true } },
  _count: { select: { employees: true, children: true } },
} satisfies Prisma.DepartmentInclude;

export function listDepartments() {
  return prisma.department.findMany({
    include: departmentInclude,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

async function assertDepartmentExists(id: string) {
  const department = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!department) {
    throw new AppError(400, "INVALID_PARENT_DEPARTMENT", "The selected parent department does not exist");
  }
}

async function assertNoHierarchyCycle(departmentId: string, parentDepartmentId: string | null) {
  let currentId = parentDepartmentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === departmentId) {
      throw new AppError(400, "DEPARTMENT_HIERARCHY_CYCLE", "A department cannot be its own ancestor");
    }
    if (visited.has(currentId)) {
      throw new AppError(409, "INVALID_DEPARTMENT_HIERARCHY", "The existing department hierarchy contains a cycle");
    }
    visited.add(currentId);
    const current: { parentDepartmentId: string | null } | null = await prisma.department.findUnique({
      where: { id: currentId },
      select: { parentDepartmentId: true },
    });
    if (!current) {
      throw new AppError(400, "INVALID_PARENT_DEPARTMENT", "The selected parent department does not exist");
    }
    currentId = current.parentDepartmentId;
  }
}

export async function createDepartment(input: CreateDepartmentInput) {
  if (input.parentDepartmentId) {
    await assertDepartmentExists(input.parentDepartmentId);
  }

  return prisma.department.create({ data: input, include: departmentInclude });
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  const existing = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new AppError(404, "DEPARTMENT_NOT_FOUND", "Department not found");
  }

  if (input.parentDepartmentId !== undefined) {
    await assertNoHierarchyCycle(id, input.parentDepartmentId);
  }

  if (input.headEmployeeId) {
    const head = await prisma.employee.findUnique({
      where: { id: input.headEmployeeId },
      select: { departmentId: true, status: true },
    });
    if (!head || head.departmentId !== id) {
      throw new AppError(400, "INVALID_DEPARTMENT_HEAD", "The department head must be an employee in this department");
    }
    if (head.status !== EmployeeStatus.ACTIVE) {
      throw new AppError(400, "INVALID_DEPARTMENT_HEAD", "An inactive employee cannot be a department head");
    }
  }

  return prisma.department.update({ where: { id }, data: input, include: departmentInclude });
}

export async function deleteDepartment(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, children: true, auditCycles: true } } },
  });

  if (!department) {
    throw new AppError(404, "DEPARTMENT_NOT_FOUND", "Department not found");
  }

  const blockers = {
    employees: department._count.employees,
    childDepartments: department._count.children,
    auditCycles: department._count.auditCycles,
  };
  if (Object.values(blockers).some((count) => count > 0)) {
    throw new AppError(
      409,
      "DEPARTMENT_IN_USE",
      "Department cannot be deleted while it has employees, child departments, or audit cycles",
      blockers,
    );
  }

  await prisma.department.delete({ where: { id } });
}
