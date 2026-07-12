import type { Request, Response } from "express";

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
  const { id } = employeeIdParamsSchema.parse(request.params);
  const { role } = promoteEmployeeSchema.parse(request.body);
  response.json({ data: await promoteEmployee(id, role) });
}

export async function updateEmployeeStatusController(request: Request, response: Response) {
  const { id } = employeeIdParamsSchema.parse(request.params);
  const { status } = updateEmployeeStatusSchema.parse(request.body);
  response.json({ data: await updateEmployeeStatus(id, status) });
}
