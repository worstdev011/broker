import type { Transaction, CreateTransactionDto } from '../../domain/finance/TransactionTypes.js';

export interface TransactionRepository {
  create(data: CreateTransactionDto): Promise<Transaction>;
  confirm(transactionId: string): Promise<void>;
  getBalance(accountId: string): Promise<number>;
  findById(transactionId: string): Promise<Transaction | null>;
  findByAccountId(accountId: string): Promise<Transaction[]>;
  findConfirmedByAccountIdBefore(accountId: string, beforeDate: Date): Promise<Transaction[]>;
  findConfirmedByAccountIdInDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]>;
}
