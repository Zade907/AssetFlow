import { z } from "zod";

const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const jsonObjectSchema = z.record(z.unknown());

export const categoryIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1_000).nullable().optional(),
    customFields: jsonObjectSchema.nullable().optional(),
    status: statusSchema.optional(),
  })
  .strict();

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
