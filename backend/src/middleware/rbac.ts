import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "../utils/app-error";

export const requireRole = (...roles: Role[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required"));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }

    next();
  };
