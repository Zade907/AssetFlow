import { apiClient } from "../../lib/apiClient";
import { unwrapList } from "../../lib/utils";
import type { Role } from "../auth/types";

export type EntityStatus = "ACTIVE" | "INACTIVE";

export type Department = {
  id: string;
  name: string;
  code: string;
  status: EntityStatus;
  parentDepartmentId?: string | null;
  parent?: { id: string; name: string } | null;
  headEmployeeId?: string | null;
  head?: Pick<Employee, "id" | "name" | "email" | "role" | "status"> | null;
  _count?: { employees?: number; children?: number };
  employeeCount?: number;
};

export type CustomFieldType = "text" | "number" | "date" | "boolean";
export type CustomFieldDefinition = { label: string; type: CustomFieldType; required: boolean };

export type AssetCategory = {
  id: string;
  name: string;
  description?: string | null;
  customFields?: Record<string, CustomFieldDefinition> | null;
  status: EntityStatus;
  _count?: { assets?: number };
  assetCount?: number;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: EntityStatus;
  departmentId?: string | null;
  department?: { id: string; name: string; code?: string } | null;
};

function normalizeEmployee(raw: unknown): Employee {
  const record = raw as Record<string, unknown>;
  const user = typeof record.user === "object" && record.user ? record.user as Record<string, unknown> : {};
  const department = typeof record.department === "object" && record.department ? record.department as Record<string, unknown> : null;
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? user.name ?? "Unnamed employee"),
    email: String(record.email ?? user.email ?? ""),
    role: (record.role ?? "EMPLOYEE") as Role,
    status: (record.status ?? "ACTIVE") as EntityStatus,
    departmentId: record.departmentId ? String(record.departmentId) : null,
    department: department ? { id: String(department.id ?? ""), name: String(department.name ?? ""), code: department.code ? String(department.code) : undefined } : null,
  };
}

export const orgApi = {
  async listDepartments() {
    const { data } = await apiClient.get("/departments");
    return unwrapList<Department>(data, ["departments"]);
  },
  createDepartment(values: { name: string; code: string; parentDepartmentId?: string | null; status: EntityStatus }) {
    return apiClient.post("/departments", values);
  },
  updateDepartment(id: string, values: { name: string; code: string; parentDepartmentId?: string | null; headEmployeeId?: string | null; status: EntityStatus }) {
    return apiClient.patch(`/departments/${id}`, values);
  },
  deleteDepartment(id: string) { return apiClient.delete(`/departments/${id}`); },

  async listCategories() {
    const { data } = await apiClient.get("/categories");
    return unwrapList<AssetCategory>(data, ["categories"]);
  },
  createCategory(values: { name: string; description?: string | null; customFields?: Record<string, CustomFieldDefinition> | null; status: EntityStatus }) { return apiClient.post("/categories", values); },
  updateCategory(id: string, values: { name: string; description?: string | null; customFields?: Record<string, CustomFieldDefinition> | null; status: EntityStatus }) { return apiClient.patch(`/categories/${id}`, values); },
  deleteCategory(id: string) { return apiClient.delete(`/categories/${id}`); },

  async listEmployees(filters: { search?: string; role?: Role; status?: EntityStatus; departmentId?: string } = {}) {
    const { data } = await apiClient.get("/employees", { params: filters });
    return unwrapList<unknown>(data, ["employees", "users"]).map(normalizeEmployee);
  },
  promoteEmployee(id: string, role: Role) { return apiClient.patch(`/employees/${id}/promote`, { role }); },
  setEmployeeStatus(id: string, status: EntityStatus) { return apiClient.patch(`/employees/${id}/status`, { status }); },
};

export const orgQueryKeys = {
  departments: ["org-setup", "departments"] as const,
  categories: ["org-setup", "categories"] as const,
  employees: ["org-setup", "employees"] as const,
};
