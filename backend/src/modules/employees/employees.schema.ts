import { z } from "zod";

export const roleSchema = z.enum(["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"]);
export const employeeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const employeeIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const listEmployeesQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    role: roleSchema.optional(),
    status: employeeStatusSchema.optional(),
    departmentId: z.string().uuid().optional(),
  })
  .strict();

export const promoteEmployeeSchema = z.object({ role: roleSchema }).strict();
export const updateEmployeeStatusSchema = z.object({ status: employeeStatusSchema }).strict();

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
