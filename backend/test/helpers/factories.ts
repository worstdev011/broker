/**
 * Test factories - create test data
 */

import type { User, Account, Trade } from '../../src/domain/trades/TradeTypes.js';
import { TradeStatus, TradeDirection } from '../../src/domain/trades/TradeTypes.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: overrides?.id || 'test-user-id',
    email: overrides?.email || 'test@example.com',
    password: overrides?.password || 'hashed-password',
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

export function createTestAccount(overrides?: Partial<Account>): Account {
  return {
    id: overrides?.id || 'test-account-id',
    userId: overrides?.userId || 'test-user-id',
    type: overrides?.type || AccountType.DEMO,
    balance: overrides?.balance !== undefined ? overrides.balance : 1000,
    currency: overrides?.currency || 'USD',
    isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides?.createdAt || new Date(),
  };
}

export function createTestTrade(overrides?: Partial<Trade>): Trade {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30000); // 30 seconds from now

  return {
    id: overrides?.id || 'test-trade-id',
    userId: overrides?.userId || 'test-user-id',
    accountId: overrides?.accountId || 'test-account-id',
    direction: overrides?.direction || TradeDirection.CALL,
    instrument: overrides?.instrument || 'EURUSD_OTC',
    amount: overrides?.amount !== undefined ? overrides.amount : 100,
    entryPrice: overrides?.entryPrice !== undefined ? overrides.entryPrice : 50000,
    exitPrice: overrides?.exitPrice !== undefined ? overrides.exitPrice : null,
    payout: overrides?.payout !== undefined ? overrides.payout : 0.8,
    status: overrides?.status || TradeStatus.OPEN,
    openedAt: overrides?.openedAt || now,
    expiresAt: overrides?.expiresAt || expiresAt,
    closedAt: overrides?.closedAt || null,
  };
}
