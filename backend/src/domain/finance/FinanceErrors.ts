import { AppError } from '../../shared/errors/AppError.js';

export class InvalidAmountError extends AppError {
  constructor(min: number, max: number, currency: string) {
    super(400, `Amount must be between ${min} and ${max} ${currency}`, 'INVALID_AMOUNT');
  }
}

export class TransactionNotFoundError extends AppError {
  constructor(transactionId: string) {
    super(404, `Transaction ${transactionId} not found`, 'TRANSACTION_NOT_FOUND');
  }
}
