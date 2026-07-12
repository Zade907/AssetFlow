import type { Request, Response } from "express";

import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "./departments.service";
import {
  createDepartmentSchema,
  departmentIdParamsSchema,
  updateDepartmentSchema,
} from "./departments.schema";

export async function listDepartmentsController(_request: Request, response: Response) {
  response.json({ data: await listDepartments() });
}

export async function createDepartmentController(request: Request, response: Response) {
  const data = await createDepartment(createDepartmentSchema.parse(request.body));
  response.status(201).json({ data });
}

export async function updateDepartmentController(request: Request, response: Response) {
  const { id } = departmentIdParamsSchema.parse(request.params);
  const data = await updateDepartment(id, updateDepartmentSchema.parse(request.body));
  response.json({ data });
}

export async function deleteDepartmentController(request: Request, response: Response) {
  const { id } = departmentIdParamsSchema.parse(request.params);
  await deleteDepartment(id);
  response.status(204).send();
}
