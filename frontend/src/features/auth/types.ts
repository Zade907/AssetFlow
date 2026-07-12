export const roles = ["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"] as const;
export type Role = (typeof roles)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
  departmentId?: string | null;
  department?: { id: string; name: string; code?: string } | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
