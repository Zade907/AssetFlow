import { Router } from "express";

import { authenticateToken } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  approveMaintenanceController,
  assignTechnicianController,
  createMaintenanceController,
  listMaintenanceController,
  rejectMaintenanceController,
  resolveMaintenanceController,
  startMaintenanceController,
} from "./maintenance.controller";

export const maintenanceRouter = Router();

maintenanceRouter.use(authenticateToken);
maintenanceRouter.get("/", asyncHandler(listMaintenanceController));
maintenanceRouter.post("/", asyncHandler(createMaintenanceController));
maintenanceRouter.post("/:id/approve", asyncHandler(approveMaintenanceController));
maintenanceRouter.post("/:id/reject", asyncHandler(rejectMaintenanceController));
maintenanceRouter.post("/:id/assign", asyncHandler(assignTechnicianController));
maintenanceRouter.post("/:id/start", asyncHandler(startMaintenanceController));
maintenanceRouter.post("/:id/resolve", asyncHandler(resolveMaintenanceController));
