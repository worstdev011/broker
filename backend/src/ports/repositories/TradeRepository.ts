import type { Trade } from '../../domain/trades/TradeTypes.js';
import { TradeStatus } from '../../domain/trades/TradeTypes.js';

export interface TradeRepository {
  create(trade: Omit<Trade, 'id' | 'openedAt'>): Promise<Trade>;
  findOpenExpired(now: Date): Promise<Trade[]>;
  findById(id: string): Promise<Trade | null>;
  findByUserId(userId: string): Promise<Trade[]>;
  findByUserIdPaginated(
    userId: string,
    status: 'open' | 'closed',
    limit: number,
    offset: number,
  ): Promise<{ trades: Trade[]; hasMore: boolean }>;
  findByAccountId(accountId: string): Promise<Trade[]>;
  findClosedByAccountIdBefore(accountId: string, beforeDate: Date): Promise<Trade[]>;
  findClosedByAccountIdInDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Trade[]>;
  updateResult(id: string, exitPrice: number, status: TradeStatus, closedAt: Date): Promise<Trade>;
  createWithBalanceDeduction(
    trade: Omit<Trade, 'id' | 'openedAt'>,
    accountId: string,
    amount: number,
  ): Promise<Trade>;
  closeWithBalanceCredit(
    tradeId: string,
    exitPrice: number,
    status: TradeStatus,
    closedAt: Date,
    accountId: string,
    balanceDelta: number,
  ): Promise<Trade>;
}
