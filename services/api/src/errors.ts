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

export function registerErrorHandlers(app: FastifyInstance): void {
  app.addSchema({ $id: "ApiErrorResponse", ...errorResponseSchema });

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send(errorBody(request, "ROUTE_NOT_FOUND", 404, "Route not found"));
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, "request failed");
    } else {
      request.log.warn({ err: error }, "request rejected");
    }

    const validationError = Array.isArray(error.validation);
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
