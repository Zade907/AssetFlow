import { Router } from "express";

import { authenticateToken } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/async-handler";
import {
  createDepartmentController,
  deleteDepartmentController,
  listDepartmentsController,
  updateDepartmentController,
} from "./departments.controller";

export const departmentsRouter = Router();

departmentsRouter.use(authenticateToken, requireRole("ADMIN"));
departmentsRouter.get("/", asyncHandler(listDepartmentsController));
departmentsRouter.post("/", asyncHandler(createDepartmentController));
departmentsRouter.patch("/:id", asyncHandler(updateDepartmentController));
departmentsRouter.delete("/:id", asyncHandler(deleteDepartmentController));
