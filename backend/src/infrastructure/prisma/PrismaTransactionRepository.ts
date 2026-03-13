import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../bootstrap/database.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import type { Transaction, CreateTransactionDto, TransactionType, TransactionStatus, PaymentMethod } from '../../domain/finance/TransactionTypes.js';
import { toNumber } from '../../shared/prismaHelpers.js';

export class PrismaTransactionRepository implements TransactionRepository {
  async create(data: CreateTransactionDto): Promise<Transaction> {
    const prisma = getPrismaClient();
    const transaction = await prisma.transaction.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        type: data.type,
        status: data.status,
        amount: new Prisma.Decimal(data.amount),
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        provider: data.provider ?? null,
      },
    });
    return this.toDomain(transaction);
  }

  async confirm(transactionId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
  }

  async getBalance(accountId: string): Promise<number> {
    const prisma = getPrismaClient();
    const result = await prisma.transaction.aggregate({
      where: { accountId, status: 'CONFIRMED' },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async findById(transactionId: string): Promise<Transaction | null> {
    const prisma = getPrismaClient();
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    return transaction ? this.toDomain(transaction) : null;
  }

  async findByAccountId(accountId: string): Promise<Transaction[]> {
    const prisma = getPrismaClient();
    const transactions = await prisma.transaction.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
    });
    return transactions.map(this.toDomain);
  }

  async findConfirmedByAccountIdBefore(
    accountId: string,
    beforeDate: Date,
  ): Promise<Transaction[]> {
    const prisma = getPrismaClient();
    const transactions = await prisma.transaction.findMany({
      where: { accountId, status: 'CONFIRMED', createdAt: { lt: beforeDate } },
      orderBy: { createdAt: 'asc' },
    });
    return transactions.map(this.toDomain);
  }

  async findConfirmedByAccountIdInDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const prisma = getPrismaClient();
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId,
        status: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    });
    return transactions.map(this.toDomain);
  }

  private toDomain(transaction: {
    id: string;
    userId: string;
    accountId: string;
    type: string;
    status: string;
    amount: Prisma.Decimal | number;
    currency: string;
    paymentMethod: string;
    provider: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
  }): Transaction {
    return {
      id: transaction.id,
      userId: transaction.userId,
      accountId: transaction.accountId,
      type: transaction.type as TransactionType,
      status: transaction.status as TransactionStatus,
      amount: toNumber(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod as PaymentMethod,
      provider: transaction.provider,
      createdAt: transaction.createdAt,
      confirmedAt: transaction.confirmedAt,
    };
  }
}
