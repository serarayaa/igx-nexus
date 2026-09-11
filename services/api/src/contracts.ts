export const API_VERSION = "v1" as const;
export const API_SERVICE_VERSION = "0.2.0-dev" as const;
export const API_SERVICE_NAME = "nexus-api" as const;

export interface ApiErrorResponse {
  readonly code: string;
  readonly statusCode: number;
  readonly message: string;
  readonly requestId: string;
}

export const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code", "statusCode", "message", "requestId"],
  properties: {
    code: { type: "string" },
    statusCode: { type: "integer", minimum: 400, maximum: 599 },
    message: { type: "string" },
    requestId: { type: "string" },
  },
} as const;
