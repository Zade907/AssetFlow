import type { Request, Response } from "express";

import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.schema";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./categories.service";

export async function listCategoriesController(_request: Request, response: Response) {
  response.json({ data: await listCategories() });
}

export async function createCategoryController(request: Request, response: Response) {
  const data = await createCategory(createCategorySchema.parse(request.body));
  response.status(201).json({ data });
}

export async function updateCategoryController(request: Request, response: Response) {
  const { id } = categoryIdParamsSchema.parse(request.params);
  response.json({ data: await updateCategory(id, updateCategorySchema.parse(request.body)) });
}

export async function deleteCategoryController(request: Request, response: Response) {
  const { id } = categoryIdParamsSchema.parse(request.params);
  await deleteCategory(id);
  response.status(204).send();
}
