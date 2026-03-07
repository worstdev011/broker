/**
 * Prisma implementation of AccountRepository
 */

import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../bootstrap/database.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import { AccountType, type Account } from '../../domain/accounts/AccountTypes.js';

export class PrismaAccountRepository implements AccountRepository {
  async findByUserId(userId: string): Promise<Account[]> {
    const prisma = getPrismaClient();
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map(this.toDomain);
  }

  async findActiveByUserId(userId: string): Promise<Account | null> {
    const prisma = getPrismaClient();
    const account = await prisma.account.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    return account ? this.toDomain(account) : null;
  }

  async findByUserIdAndType(userId: string, type: string): Promise<Account | null> {
    const prisma = getPrismaClient();
    const account = await prisma.account.findUnique({
      where: {
        userId_type: {
          userId,
          type: type as 'demo' | 'real',
        },
      },
    });

    return account ? this.toDomain(account) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const prisma = getPrismaClient();
    const account = await prisma.account.findUnique({
      where: { id },
    });

    return account ? this.toDomain(account) : null;
  }

  async create(accountData: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const prisma = getPrismaClient();
    const account = await prisma.account.create({
      data: {
        userId: accountData.userId,
        type: accountData.type as 'demo' | 'real',
        balance: new Prisma.Decimal(accountData.balance),
        currency: accountData.currency,
        isActive: accountData.isActive,
      },
    });

    return this.toDomain(account);
  }

  async setActive(userId: string, accountId: string): Promise<void> {
    const prisma = getPrismaClient();

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Deactivate all user accounts
      await tx.account.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Activate the specified account
      await tx.account.update({
        where: { id: accountId },
        data: { isActive: true },
      });
    });
  }

  async updateBalance(accountId: string, delta: number): Promise<Account> {
    const prisma = getPrismaClient();

    // Atomic update using Prisma increment
    // This ensures atomicity at database level
    const account = await prisma.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: new Prisma.Decimal(delta),
        },
      },
    });

    return this.toDomain(account);
  }

  /**
   * 🔥 FLOW W1: Get or create REAL account for user
   */
  async getRealAccount(userId: string): Promise<Account> {
    const prisma = getPrismaClient();

    // Try to find existing REAL account
    let account = await prisma.account.findUnique({
      where: {
        userId_type: {
          userId,
          type: 'real',
        },
      },
    });

    // Create if doesn't exist
    if (!account) {
      account = await prisma.account.create({
        data: {
          userId,
          type: 'real',
          balance: new Prisma.Decimal(0),
          currency: 'UAH',
          isActive: true,
        },
      });
    }

    return this.toDomain(account);
  }

  /**
   * 🔥 FLOW D-RESET-DEMO: Find demo account by user ID
   */
  async findDemoByUserId(userId: string): Promise<Account | null> {
    const prisma = getPrismaClient();
    const account = await prisma.account.findFirst({
      where: {
        userId,
        type: 'demo',
      },
    });

    return account ? this.toDomain(account) : null;
  }

  /**
   * 🔥 Синхрон валюты: обновить валюту у всех счетов пользователя (при выборе в модалке)
   */
  async updateCurrencyByUserId(userId: string, currency: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.account.updateMany({
      where: { userId },
      data: { currency },
    });
  }

  /**
   * 🔥 FLOW D-RESET-DEMO: Set absolute balance (not delta)
   */
  async setBalance(accountId: string, balance: number): Promise<Account> {
    const prisma = getPrismaClient();

    const account = await prisma.account.update({
      where: { id: accountId },
      data: {
        balance: new Prisma.Decimal(balance),
      },
    });

    return this.toDomain(account);
  }

  private toDomain(account: {
    id: string;
    userId: string;
    type: string;
    balance: Prisma.Decimal | number;
    currency: string;
    isActive: boolean;
    createdAt: Date;
  }): Account {
    return {
      id: account.id,
      userId: account.userId,
      type: account.type as AccountType,
      balance: typeof account.balance === 'number' ? account.balance : Number(account.balance),
      currency: account.currency,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };
  }
}
