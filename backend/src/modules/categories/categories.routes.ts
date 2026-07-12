import { Router } from "express";

import { authenticateToken } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/async-handler";
import {
  createCategoryController,
  deleteCategoryController,
  listCategoriesController,
  updateCategoryController,
} from "./categories.controller";

export const categoriesRouter = Router();

categoriesRouter.use(authenticateToken, requireRole("ADMIN"));
categoriesRouter.get("/", asyncHandler(listCategoriesController));
categoriesRouter.post("/", asyncHandler(createCategoryController));
categoriesRouter.patch("/:id", asyncHandler(updateCategoryController));
categoriesRouter.delete("/:id", asyncHandler(deleteCategoryController));
