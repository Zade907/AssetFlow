import { z } from "zod";

const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const departmentIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const createDepartmentSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((value) => value.toUpperCase()),
    parentDepartmentId: z.string().uuid().nullable().optional(),
    status: statusSchema.optional(),
  })
  .strict();

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    parentDepartmentId: z.string().uuid().nullable().optional(),
    headEmployeeId: z.string().uuid().nullable().optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
