import { z } from "zod";

const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const customFieldTypeSchema = z.enum(["text", "number", "date", "boolean"]);
export const customFieldDefinitionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  type: customFieldTypeSchema,
  required: z.boolean().default(false),
}).strict();
export const customFieldsSchema = z
  .record(
    z.string().trim().min(1).max(50).regex(/^[a-z][a-zA-Z0-9_]*$/, "Custom field keys must use camelCase"),
    customFieldDefinitionSchema,
  )
  .refine((fields) => Object.keys(fields).length <= 20, "A category can define at most 20 custom fields");

export const categoryIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1_000).nullable().optional(),
    customFields: customFieldsSchema.nullable().optional(),
    status: statusSchema.optional(),
  })
  .strict();

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
