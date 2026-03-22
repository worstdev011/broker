/**
 * Test mocks - mock external dependencies
 */

import type { PriceProvider } from '../../src/ports/pricing/PriceProvider.js';
import type { AccountRepository } from '../../src/ports/repositories/AccountRepository.js';
import type { TradeRepository } from '../../src/ports/repositories/TradeRepository.js';
import type { TransactionRepository } from '../../src/ports/repositories/TransactionRepository.js';
import type { Clock } from '../../src/domain/time/TimeTypes.js';
import type { Account } from '../../src/domain/accounts/AccountTypes.js';
import type { Trade } from '../../src/domain/trades/TradeTypes.js';
import type { Transaction, CreateTransactionDto } from '../../src/domain/finance/TransactionTypes.js';
import { TradeStatus } from '../../src/domain/trades/TradeTypes.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';

/**
 * Mock PriceProvider
 */
export function mockPriceProvider(overrides?: Partial<PriceProvider>): PriceProvider {
  return {
    getCurrentPrice: async (asset: string) => {
      if (overrides?.getCurrentPrice) {
        return overrides.getCurrentPrice(asset);
      }
      return {
        price: 50000,
        timestamp: Date.now(),
      };
    },
  };
}

/**
 * Mock AccountRepository
 */
export function mockAccountRepository(overrides?: Partial<AccountRepository>): AccountRepository {
  const accounts = new Map<string, Account>();

  return {
    findByUserId: async (userId: string) => {
      if (overrides?.findByUserId) {
        return overrides.findByUserId(userId);
      }
      return Array.from(accounts.values()).filter((acc) => acc.userId === userId);
    },
    findActiveByUserId: async (userId: string) => {
      if (overrides?.findActiveByUserId) {
        return overrides.findActiveByUserId(userId);
      }
      return Array.from(accounts.values()).find((acc) => acc.userId === userId && acc.isActive) || null;
    },
    findById: async (id: string) => {
      if (overrides?.findById) {
        return overrides.findById(id);
      }
      return accounts.get(id) || null;
    },
    findByUserIdAndType: async (userId: string, type: string) => {
      if (overrides?.findByUserIdAndType) {
        return overrides.findByUserIdAndType(userId, type);
      }
      return Array.from(accounts.values()).find((acc) => acc.userId === userId && acc.type === type) || null;
    },
    create: async (account: Omit<Account, 'id' | 'createdAt'>) => {
      if (overrides?.create) {
        return overrides.create(account);
      }
      const newAccount: Account = {
        ...account,
        id: `account-${Date.now()}`,
        createdAt: new Date(),
      };
      accounts.set(newAccount.id, newAccount);
      return newAccount;
    },
    setActive: async (userId: string, accountId: string) => {
      if (overrides?.setActive) {
        return overrides.setActive(userId, accountId);
      }
      // Implementation
    },
    updateBalance: async (accountId: string, delta: number) => {
      if (overrides?.updateBalance) {
        return overrides.updateBalance(accountId, delta);
      }
      const account = accounts.get(accountId);
      if (account) {
        const currentBalance = typeof account.balance === 'number' ? account.balance : Number(account.balance.toString());
        const newBalance = currentBalance + delta;
        const updated: Account = {
          ...account,
          balance: newBalance,
        };
        accounts.set(accountId, updated);
        return updated;
      }
      throw new Error('Account not found');
    },
    getRealAccount: async (userId: string) => {
      if (overrides?.getRealAccount) return overrides.getRealAccount(userId);
      let real = Array.from(accounts.values()).find((a) => a.userId === userId && a.type === AccountType.REAL);
      if (!real) {
        real = {
          id: `real-${Date.now()}`,
          userId,
          type: AccountType.REAL,
          balance: 0,
          currency: 'UAH',
          isActive: false,
          createdAt: new Date(),
        };
        accounts.set(real.id, real);
      }
      return real;
    },
    findDemoByUserId: async (userId: string) => {
      if (overrides?.findDemoByUserId) return overrides.findDemoByUserId(userId);
      return Array.from(accounts.values()).find((a) => a.userId === userId && a.type === AccountType.DEMO) || null;
    },
    setBalance: async (accountId: string, balance: number) => {
      if (overrides?.setBalance) return overrides.setBalance(accountId, balance);
      const account = accounts.get(accountId);
      if (!account) throw new Error('Account not found');
      const updated: Account = { ...account, balance };
      accounts.set(accountId, updated);
      return updated;
    },
  };
}

/**
 * Mock TransactionRepository
 */
export function mockTransactionRepository(
  overrides?: Partial<TransactionRepository>
): TransactionRepository {
  const transactions = new Map<string, Transaction>();

  return {
    create: async (data: CreateTransactionDto) => {
      if (overrides?.create) return overrides.create(data);
      const tx: Transaction = {
        ...data,
        id: `tx-${Date.now()}`,
        provider: data.provider ?? null,
        externalId: data.externalId ?? null,
        externalStatus: data.externalStatus ?? null,
        cardLastFour: data.cardLastFour ?? null,
        createdAt: new Date(),
        confirmedAt: null,
      };
      transactions.set(tx.id, tx);
      return tx;
    },
    confirm: async (id: string) => {
      if (overrides?.confirm) return overrides.confirm(id);
      const tx = transactions.get(id);
      if (tx) {
        tx.status = 'CONFIRMED' as any;
        tx.confirmedAt = new Date();
      }
    },
    update: async (id: string, patch) => {
      if (overrides?.update) return overrides.update(id, patch);
      const tx = transactions.get(id);
      if (tx) {
        if (patch.status !== undefined) tx.status = patch.status as any;
        if (patch.externalId !== undefined) tx.externalId = patch.externalId;
        if (patch.externalStatus !== undefined) tx.externalStatus = patch.externalStatus;
        if (patch.confirmedAt !== undefined) tx.confirmedAt = patch.confirmedAt;
      }
    },
    getBalance: async (accountId: string) => {
      if (overrides?.getBalance) return overrides.getBalance(accountId);
      return Array.from(transactions.values())
        .filter((t) => t.accountId === accountId && t.status === 'CONFIRMED')
        .reduce((sum, t) => sum + t.amount, 0);
    },
    findById: async (id: string) => transactions.get(id) || null,
    findByAccountId: async (accountId: string) =>
      Array.from(transactions.values()).filter((t) => t.accountId === accountId),
    findConfirmedByAccountIdBefore: async () => [],
    findConfirmedByAccountIdInDateRange: async () => [],
  };
}

/**
 * Mock TradeRepository
 */
export function mockTradeRepository(overrides?: Partial<TradeRepository>): TradeRepository {
  const trades = new Map<string, Trade>();

  return {
    create: async (trade: Omit<Trade, 'id' | 'openedAt'>) => {
      if (overrides?.create) {
        return overrides.create(trade);
      }
      const newTrade: Trade = {
        ...trade,
        id: `trade-${Date.now()}`,
        openedAt: new Date(),
      };
      trades.set(newTrade.id, newTrade);
      return newTrade;
    },
    findOpenExpired: async (now: Date) => {
      if (overrides?.findOpenExpired) {
        return overrides.findOpenExpired(now);
      }
      return Array.from(trades.values()).filter(
        (trade) => trade.status === TradeStatus.OPEN && trade.expiresAt <= now,
      );
    },
    findById: async (id: string) => {
      if (overrides?.findById) {
        return overrides.findById(id);
      }
      return trades.get(id) || null;
    },
    findByUserId: async (userId: string) => {
      if (overrides?.findByUserId) {
        return overrides.findByUserId(userId);
      }
      return Array.from(trades.values()).filter((trade) => trade.userId === userId);
    },
    findByUserIdPaginated: async (userId: string, status: 'open' | 'closed', limit: number, offset: number) => {
      if (overrides?.findByUserIdPaginated) {
        return overrides.findByUserIdPaginated(userId, status, limit, offset);
      }
      const filtered = Array.from(trades.values()).filter((t) => {
        if (status === 'open') return t.status === TradeStatus.OPEN;
        return t.status !== TradeStatus.OPEN && t.closedAt !== null;
      });
      return {
        trades: filtered.slice(offset, offset + limit),
        hasMore: filtered.length > offset + limit,
      };
    },
    findByAccountId: async (accountId: string) => {
      if (overrides?.findByAccountId) {
        return overrides.findByAccountId(accountId);
      }
      return Array.from(trades.values()).filter((trade) => trade.accountId === accountId);
    },
    findClosedByAccountIdBefore: async (accountId: string, beforeDate: Date) => {
      if (overrides?.findClosedByAccountIdBefore) {
        return overrides.findClosedByAccountIdBefore(accountId, beforeDate);
      }
      return Array.from(trades.values()).filter(
        (t) =>
          t.accountId === accountId &&
          t.closedAt !== null &&
          t.closedAt < beforeDate &&
          t.status !== TradeStatus.OPEN
      );
    },
    findClosedByAccountIdInDateRange: async (
      accountId: string,
      startDate: Date,
      endDate: Date
    ) => {
      if (overrides?.findClosedByAccountIdInDateRange) {
        return overrides.findClosedByAccountIdInDateRange(accountId, startDate, endDate);
      }
      return Array.from(trades.values()).filter(
        (t) =>
          t.accountId === accountId &&
          t.closedAt !== null &&
          t.closedAt >= startDate &&
          t.closedAt <= endDate &&
          t.status !== TradeStatus.OPEN
      );
    },
    updateResult: async (id: string, exitPrice: number, status: TradeStatus, closedAt: Date) => {
      if (overrides?.updateResult) {
        return overrides.updateResult(id, exitPrice, status, closedAt);
      }
      const trade = trades.get(id);
      if (!trade) {
        // If trade not in cache, create it (for tests that don't pre-create)
      const newTrade: Trade = {
        id,
        userId: 'test-user',
        accountId: 'test-account',
        direction: 'CALL' as any,
        instrument: 'EURUSD_OTC',
        amount: 100,
        entryPrice: 50000,
        exitPrice,
        payout: 0.8,
        status,
        openedAt: new Date(),
        expiresAt: new Date(),
        closedAt,
      };
        trades.set(id, newTrade);
        return newTrade;
      }
      const updatedTrade: Trade = {
        ...trade,
        exitPrice,
        status,
        closedAt,
      };
      trades.set(id, updatedTrade);
      return updatedTrade;
    },
  };
}

/**
 * Mock Clock
 */
export function mockClock(overrides?: Partial<Clock>): Clock {
  let currentTime = Date.now();

  return {
    now: () => {
      if (overrides?.now) {
        return overrides.now();
      }
      return currentTime;
    },
    // Helper to advance time
    advance: (ms: number) => {
      currentTime += ms;
    },
    // Helper to set time
    setTime: (time: number) => {
      currentTime = time;
    },
  } as Clock & { advance: (ms: number) => void; setTime: (time: number) => void };
}
