import type { FastifyInstance, FastifyRequest } from "fastify";
import { errorResponseSchema, type ApiErrorResponse } from "./contracts.js";

function errorBody(
  request: FastifyRequest,
  code: string,
  statusCode: number,
  message: string,
): ApiErrorResponse {
  return { code, statusCode, message, requestId: request.id };
}

function readClientStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;

  const statusCode = (error as { readonly statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" && statusCode >= 400 && statusCode < 500
    ? statusCode
    : undefined;
}

function hasValidationDetails(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("validation" in error)) return false;
  return Array.isArray((error as { readonly validation?: unknown }).validation);
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.addSchema({ $id: "ApiErrorResponse", ...errorResponseSchema });

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send(errorBody(request, "ROUTE_NOT_FOUND", 404, "Route not found"));
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = readClientStatusCode(error) ?? 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, "request failed");
    } else {
      request.log.warn({ err: error }, "request rejected");
    }

    const validationError = hasValidationDetails(error);
    const code = validationError
      ? "VALIDATION_ERROR"
      : statusCode >= 500
        ? "INTERNAL_ERROR"
        : "REQUEST_ERROR";
    const message = validationError
      ? "Request validation failed"
      : statusCode >= 500
        ? "Internal server error"
        : "Request failed";

    void reply.status(statusCode).send(errorBody(request, code, statusCode, message));
  });
}
