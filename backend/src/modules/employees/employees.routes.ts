import { Router } from "express";

import { authenticateToken } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/async-handler";
import {
  listEmployeesController,
  promoteEmployeeController,
  updateEmployeeStatusController,
} from "./employees.controller";

export const employeesRouter = Router();

employeesRouter.use(authenticateToken, requireRole("ADMIN"));
employeesRouter.get("/", asyncHandler(listEmployeesController));
employeesRouter.patch("/:id/promote", asyncHandler(promoteEmployeeController));
employeesRouter.patch("/:id/status", asyncHandler(updateEmployeeStatusController));
