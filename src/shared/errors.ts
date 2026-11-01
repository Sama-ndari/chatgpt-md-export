export type ErrorCode =
  | "AUTH_TOKEN_MISSING"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_FAILED"
  | "UNSUPPORTED_URL"
  | "CONVERSATION_NOT_FOUND_OR_FORBIDDEN"
  | "REMOTE_REQUEST_FAILED"
  | "FILE_DOWNLOAD_FAILED"
  | "FILE_OWNER_MISMATCH"
  | "EXPORT_WRITE_FAILED"
  | "CLI_USAGE_ERROR";

export interface SerializedError {
  error_code: ErrorCode;
  message: string;
  recoverable: boolean;
}

export class AppError extends Error {
  readonly error_code: ErrorCode;
  readonly recoverable: boolean;

  constructor(error_code: ErrorCode, message: string, options: { recoverable?: boolean } = {}) {
    super(message);
    this.name = "AppError";
    this.error_code = error_code;
    this.recoverable = options.recoverable ?? true;
  }
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof AppError) {
    return {
      error_code: error.error_code,
      message: error.message,
      recoverable: error.recoverable
    };
  }

  return {
    error_code: "REMOTE_REQUEST_FAILED",
    message: error instanceof Error ? error.message : String(error),
    recoverable: true
  };
}
