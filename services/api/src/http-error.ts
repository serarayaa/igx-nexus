export class ApiHttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly safeMessage: string;

  constructor(statusCode: number, code: string, safeMessage: string) {
    super(safeMessage);
    this.name = "ApiHttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.safeMessage = safeMessage;
  }
}
