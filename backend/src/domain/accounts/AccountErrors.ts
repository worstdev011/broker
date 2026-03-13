import { AppError } from '../../shared/errors/AppError.js';

export class AccountNotFoundError extends AppError {
  constructor(accountId?: string) {
    super(404, accountId ? `Account ${accountId} not found` : 'Account not found', 'ACCOUNT_NOT_FOUND');
  }
}

export class AccountAlreadyExistsError extends AppError {
  constructor(userId: string, type: string) {
    super(409, `Account of type ${type} already exists for user ${userId}`, 'ACCOUNT_ALREADY_EXISTS');
  }
}

export class InvalidAccountTypeError extends AppError {
  constructor(type: string) {
    super(400, `Invalid account type: ${type}`, 'INVALID_ACCOUNT_TYPE');
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super(400, 'Insufficient balance', 'INSUFFICIENT_BALANCE');
  }
}

export class UnauthorizedAccountAccessError extends AppError {
  constructor() {
    super(403, 'Unauthorized access to account', 'UNAUTHORIZED_ACCOUNT_ACCESS');
  }
}

export class DemoResetNotAllowedError extends AppError {
  constructor() {
    super(400, 'Demo balance is too high to reset', 'DEMO_RESET_NOT_ALLOWED');
  }
}

export class DemoAccountNotFoundError extends AppError {
  constructor() {
    super(404, 'Demo account not found', 'DEMO_ACCOUNT_NOT_FOUND');
  }
}
