import type { Department, Employee, User } from "@prisma/client";

type UserWithEmployee = User & {
  employee: (Employee & { department: Department | null }) | null;
};

export function serializeUser(user: UserWithEmployee) {
  if (!user.employee) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    employee: {
      id: user.employee.id,
      name: user.employee.name,
      email: user.employee.email,
      role: user.employee.role,
      status: user.employee.status,
      department: user.employee.department
        ? {
            id: user.employee.department.id,
            name: user.employee.department.name,
            code: user.employee.department.code,
          }
        : null,
    },
  };
}
