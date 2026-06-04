import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      issues: error.flatten()
    });
    return;
  }

  const status = typeof error?.status === "number" ? error.status : 500;
  if (status >= 400) {
    console.error(
      `[api-error] ${request.method} ${request.originalUrl} ${status} ${error?.code || "INTERNAL_ERROR"}: ${
        error?.message || "Unexpected server error"
      }`
    );
  }

  response.status(status).json({
    ok: false,
    code: error?.code || "INTERNAL_ERROR",
    message: error?.message || "Unexpected server error"
  });
};
