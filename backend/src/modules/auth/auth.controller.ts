import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error";
import { getCurrentUser, login, signup } from "./auth.service";
import { loginSchema, signupSchema } from "./auth.schema";

export async function signupController(request: Request, response: Response) {
  const data = await signup(signupSchema.parse(request.body));
  response.status(201).json({ data });
}

export async function loginController(request: Request, response: Response) {
  const data = await login(loginSchema.parse(request.body));
  response.json({ data });
}

export async function meController(request: Request, response: Response) {
  if (!request.auth) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }

  response.json({ data: await getCurrentUser(request.auth.userId) });
}
