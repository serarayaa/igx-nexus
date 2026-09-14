import type { FastifyInstance, FastifyRequest } from "fastify";
import { errorResponseSchema, type ApiErrorResponse } from "./contracts.js";
import { ApiHttpError } from "./http-error.js";

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

function readErrorType(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function safeClientError(error: unknown, statusCode: number): { code: string; message: string } {
  if (error instanceof ApiHttpError) {
    return { code: error.code, message: error.safeMessage };
  }

  if (hasValidationDetails(error)) {
    return { code: "VALIDATION_ERROR", message: "Request validation failed" };
  }

  if (statusCode === 413) {
    return { code: "PAYLOAD_TOO_LARGE", message: "Request payload too large" };
  }

  if (statusCode === 429) {
    return { code: "RATE_LIMITED", message: "Too many requests" };
  }

  return { code: "REQUEST_ERROR", message: "Request failed" };
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.addSchema({ $id: "ApiErrorResponse", ...errorResponseSchema });

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send(errorBody(request, "ROUTE_NOT_FOUND", 404, "Route not found"));
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error instanceof ApiHttpError
      ? error.statusCode
      : readClientStatusCode(error) ?? 500;
    const errorMetadata = {
      errorType: readErrorType(error),
      statusCode,
      ...(error instanceof ApiHttpError ? { errorCode: error.code } : {}),
    };

    if (statusCode >= 500) {
      request.log.error({ errorMetadata }, "request failed");
    } else {
      request.log.warn({ errorMetadata }, "request rejected");
    }

    if (statusCode >= 500) {
      void reply.status(statusCode).send(errorBody(request, "INTERNAL_ERROR", statusCode, "Internal server error"));
      return;
    }

    const safeError = safeClientError(error, statusCode);
    void reply.status(statusCode).send(errorBody(request, safeError.code, statusCode, safeError.message));
  });
}
