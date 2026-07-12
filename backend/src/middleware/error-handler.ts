import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, "NOT_FOUND", `Route ${request.method} ${request.originalUrl} was not found`));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request data is invalid",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A record with one of these unique values already exists",
          details: error.meta,
        },
      });
      return;
    }

    if (error.code === "P2003") {
      response.status(409).json({
        error: {
          code: "RECORD_IN_USE",
          message: "This record is still referenced and cannot be deleted",
          details: error.meta,
        },
      });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({
        error: { code: "NOT_FOUND", message: "The requested record was not found" },
      });
      return;
    }
  }

  if (env.NODE_ENV !== "test") {
    console.error(error);
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      ...(env.NODE_ENV === "development" && error instanceof Error
        ? { details: error.message }
        : {}),
    },
  });
};
