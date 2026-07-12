import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error";
import {
  approveMaintenanceRequestSchema,
  assignTechnicianSchema,
  createMaintenanceRequestSchema,
  listMaintenanceQuerySchema,
  maintenanceIdParamsSchema,
  rejectMaintenanceRequestSchema,
  resolveMaintenanceRequestSchema,
} from "./maintenance.schema";
import {
  approveMaintenanceRequest,
  assignTechnician,
  createMaintenanceRequest,
  listMaintenanceRequests,
  rejectMaintenanceRequest,
  resolveMaintenanceRequest,
  startMaintenanceWork,
} from "./maintenance.service";

function requireAuth(request: Request) {
  if (!request.auth) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }
  return request.auth;
}

export async function listMaintenanceController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const query = listMaintenanceQuerySchema.parse(request.query);
  const data = await listMaintenanceRequests(query, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.json({ data });
}

export async function createMaintenanceController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const input = createMaintenanceRequestSchema.parse(request.body);
  const data = await createMaintenanceRequest(input, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.status(201).json({ data });
}

export async function approveMaintenanceController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = maintenanceIdParamsSchema.parse(request.params);
  const input = approveMaintenanceRequestSchema.parse(request.body ?? {});
  const data = await approveMaintenanceRequest(id, input, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.json({ data });
}

export async function rejectMaintenanceController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = maintenanceIdParamsSchema.parse(request.params);
  const input = rejectMaintenanceRequestSchema.parse(request.body);
  const data = await rejectMaintenanceRequest(id, input, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.json({ data });
}

export async function assignTechnicianController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = maintenanceIdParamsSchema.parse(request.params);
  const input = assignTechnicianSchema.parse(request.body);
  const data = await assignTechnician(id, input, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.json({ data });
}

export async function startMaintenanceController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = maintenanceIdParamsSchema.parse(request.params);
  const data = await startMaintenanceWork(id, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.json({ data });
}

export async function resolveMaintenanceController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = maintenanceIdParamsSchema.parse(request.params);
  const input = resolveMaintenanceRequestSchema.parse(request.body);
  const data = await resolveMaintenanceRequest(id, input, {
    employeeId: auth.employeeId,
    role: auth.role,
  });
  response.json({ data });
}
