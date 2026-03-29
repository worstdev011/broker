export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message = "Not found"): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static badRequest(message: string): AppError {
    return new AppError("BAD_REQUEST", message, 400);
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, 409);
  }
}
