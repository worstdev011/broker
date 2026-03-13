import { AppError } from '../../shared/errors/AppError.js';

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(401, message, 'INVALID_CREDENTIALS');
  }
}

export class UserAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(409, `User with email ${email} already exists`, 'USER_ALREADY_EXISTS');
  }
}

export class SessionNotFoundError extends AppError {
  constructor() {
    super(401, 'Session not found or expired', 'SESSION_NOT_FOUND');
  }
}

export class InvalidSessionError extends AppError {
  constructor(message = 'Invalid or expired session') {
    super(401, message, 'INVALID_SESSION');
  }
}
