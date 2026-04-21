export type ServiceErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "NETWORK"
  | "UNAVAILABLE"
  | "UNKNOWN";

export class ServiceError extends Error {
  code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

export function asServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new ServiceError("UNKNOWN", error.message);
  }

  return new ServiceError("UNKNOWN", "Unbekannter Fehler.");
}