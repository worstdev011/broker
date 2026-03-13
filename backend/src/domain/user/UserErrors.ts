import { AppError } from '../../shared/errors/AppError.js';

export class UserNotFoundError extends AppError {
  constructor(userId?: string) {
    super(404, userId ? `User ${userId} not found` : 'User not found', 'USER_NOT_FOUND');
  }
}

export class NicknameAlreadyTakenError extends AppError {
  constructor(nickname: string) {
    super(409, `Nickname ${nickname} is already taken`, 'NICKNAME_ALREADY_TAKEN');
  }
}

export class PhoneAlreadyTakenError extends AppError {
  constructor(phone: string) {
    super(409, `Phone ${phone} is already taken`, 'PHONE_ALREADY_TAKEN');
  }
}

export class InvalidPasswordError extends AppError {
  constructor(message = 'Invalid password') {
    super(400, message, 'INVALID_PASSWORD');
  }
}

export class UserSessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(404, `Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class InvalidDateOfBirthError extends AppError {
  constructor(message: string) {
    super(400, message, 'INVALID_DATE_OF_BIRTH');
  }
}

export class PasswordPolicyError extends AppError {
  constructor(message: string) {
    super(400, message, 'PASSWORD_POLICY_ERROR');
  }
}

export class TwoFactorError extends AppError {
  constructor(message: string) {
    super(400, message, 'TWO_FACTOR_ERROR');
  }
}

export class CurrencyAlreadySetError extends AppError {
  constructor() {
    super(400, 'Currency cannot be changed once set', 'CURRENCY_ALREADY_SET');
  }
}
