import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error";
import {
  employeeIdParamsSchema,
  listEmployeesQuerySchema,
  promoteEmployeeSchema,
  updateEmployeeStatusSchema,
} from "./employees.schema";
import { listEmployees, promoteEmployee, updateEmployeeStatus } from "./employees.service";

export async function listEmployeesController(request: Request, response: Response) {
  response.json({ data: await listEmployees(listEmployeesQuerySchema.parse(request.query)) });
}

export async function promoteEmployeeController(request: Request, response: Response) {
  if (!request.auth) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }
  const { id } = employeeIdParamsSchema.parse(request.params);
  const { role } = promoteEmployeeSchema.parse(request.body);
  response.json({
    data: await promoteEmployee(id, role, {
      employeeId: request.auth.employeeId,
      ipAddress: request.ip,
    }),
  });
}

export async function updateEmployeeStatusController(request: Request, response: Response) {
  if (!request.auth) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }
  const { id } = employeeIdParamsSchema.parse(request.params);
  const { status } = updateEmployeeStatusSchema.parse(request.body);
  response.json({ data: await updateEmployeeStatus(id, status, request.auth.employeeId) });
}
