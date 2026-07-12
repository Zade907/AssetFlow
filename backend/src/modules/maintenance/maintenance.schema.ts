import { z } from "zod";

export const maintenanceIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const createMaintenanceRequestSchema = z
  .object({
    assetId: z.string().uuid(),
    description: z.string().trim().min(5).max(1000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    photoUrl: z.string().trim().url().max(1000).optional(),
  })
  .strict();

export const approveMaintenanceRequestSchema = z
  .object({
    assignedTechnicianId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export const rejectMaintenanceRequestSchema = z
  .object({
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export const assignTechnicianSchema = z
  .object({
    assignedTechnicianId: z.string().uuid(),
  })
  .strict();

export const resolveMaintenanceRequestSchema = z
  .object({
    resolutionNotes: z.string().trim().min(3).max(1000),
  })
  .strict();

export const listMaintenanceQuerySchema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "APPROVED",
        "REJECTED",
        "TECHNICIAN_ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
      ])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    assetId: z.string().uuid().optional(),
    raisedById: z.string().uuid().optional(),
    scope: z.enum(["mine", "all"]).optional(),
  })
  .partial()
  .strict();

export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type ApproveMaintenanceRequestInput = z.infer<typeof approveMaintenanceRequestSchema>;
export type RejectMaintenanceRequestInput = z.infer<typeof rejectMaintenanceRequestSchema>;
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
export type ResolveMaintenanceRequestInput = z.infer<typeof resolveMaintenanceRequestSchema>;
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;
