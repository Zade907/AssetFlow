import { apiClient } from "../../lib/apiClient";
import type { AuthUser, LoginResponse, Role } from "./types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? value as UnknownRecord : {};
}

function normalizeUser(payload: unknown, fallbackRole?: unknown): AuthUser {
  const root = asRecord(payload);
  const employee = asRecord(root.employee);
  const department = asRecord(employee.department ?? root.department);
  const role = (employee.role ?? root.role ?? fallbackRole ?? "EMPLOYEE") as Role;
  const name = String(employee.name ?? root.name ?? root.email ?? "AssetFlow user");
  return {
    id: String(root.id ?? employee.userId ?? employee.id ?? ""),
    employeeId: employee.id ? String(employee.id) : root.employeeId ? String(root.employeeId) : undefined,
    email: String(root.email ?? employee.email ?? ""),
    name,
    role,
    departmentId: employee.departmentId ? String(employee.departmentId) : root.departmentId ? String(root.departmentId) : null,
    department: department.id ? { id: String(department.id), name: String(department.name ?? ""), code: department.code ? String(department.code) : undefined } : null,
  };
}

function payloadData(payload: unknown) {
  const record = asRecord(payload);
  return typeof record.data === "object" && record.data !== null ? asRecord(record.data) : record;
}

export const authApi = {
  async login(values: { email: string; password: string }): Promise<LoginResponse> {
    const response = await apiClient.post("/auth/login", values);
    const data = payloadData(response.data);
    const token = String(data.token ?? data.accessToken ?? "");
    if (!token) throw new Error("The server did not return an access token.");
    return { token, user: normalizeUser(data.user ?? data.employee, data.role) };
  },
  async signup(values: { name: string; email: string; password: string }) {
    await apiClient.post("/auth/signup", values);
  },
  async me(): Promise<AuthUser> {
    const response = await apiClient.get("/auth/me");
    const data = payloadData(response.data);
    return normalizeUser(data.user ?? data.employee ?? data, data.role);
  },
};
