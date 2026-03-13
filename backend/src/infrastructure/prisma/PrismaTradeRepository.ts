import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../bootstrap/database.js';
import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { Trade } from '../../domain/trades/TradeTypes.js';
import { TradeDirection, TradeStatus } from '../../domain/trades/TradeTypes.js';
import { toNumber } from '../../shared/prismaHelpers.js';

export class PrismaTradeRepository implements TradeRepository {
  async create(tradeData: Omit<Trade, 'id' | 'openedAt'>): Promise<Trade> {
    const prisma = getPrismaClient();
    const trade = await prisma.trade.create({
      data: {
        userId: tradeData.userId,
        accountId: tradeData.accountId,
        direction: tradeData.direction as 'CALL' | 'PUT',
        instrument: tradeData.instrument,
        amount: new Prisma.Decimal(tradeData.amount),
        entryPrice: new Prisma.Decimal(tradeData.entryPrice),
        exitPrice: tradeData.exitPrice !== null ? new Prisma.Decimal(tradeData.exitPrice) : null,
        payout: new Prisma.Decimal(tradeData.payout),
        status: tradeData.status as 'OPEN' | 'WIN' | 'LOSS' | 'TIE',
        expiresAt: tradeData.expiresAt,
        closedAt: tradeData.closedAt,
      },
    });
    return this.toDomain(trade);
  }

  async findOpenExpired(now: Date): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: { status: 'OPEN', expiresAt: { lte: now } },
    });
    return trades.map((t) => this.toDomain(t));
  }

  async findById(id: string): Promise<Trade | null> {
    const prisma = getPrismaClient();
    const trade = await prisma.trade.findUnique({ where: { id } });
    return trade ? this.toDomain(trade) : null;
  }

  async findByUserId(userId: string): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
    });
    return trades.map((t) => this.toDomain(t));
  }

  async findByUserIdPaginated(
    userId: string,
    status: 'open' | 'closed',
    limit: number,
    offset: number,
  ): Promise<{ trades: Trade[]; hasMore: boolean }> {
    const prisma = getPrismaClient();
    const where =
      status === 'open'
        ? { userId, status: 'OPEN' as const }
        : { userId, status: { in: ['WIN', 'LOSS', 'TIE'] as ('WIN' | 'LOSS' | 'TIE')[] }, closedAt: { not: null } };
    const orderBy = status === 'open'
      ? { openedAt: 'desc' as const }
      : { closedAt: 'desc' as const };

    const trades = await prisma.trade.findMany({
      where,
      orderBy,
      take: limit + 1,
      skip: offset,
    });

    const hasMore = trades.length > limit;
    const result = hasMore ? trades.slice(0, limit) : trades;

    return {
      trades: result.map((t) => this.toDomain(t)),
      hasMore,
    };
  }

  async findByAccountId(accountId: string): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: { accountId },
      orderBy: { openedAt: 'desc' },
    });
    return trades.map((t) => this.toDomain(t));
  }

  async findClosedByAccountIdBefore(accountId: string, beforeDate: Date): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: {
        accountId,
        status: { in: ['WIN', 'LOSS', 'TIE'] },
        closedAt: { lt: beforeDate, not: null },
      },
      orderBy: { closedAt: 'asc' },
    });
    return trades.map((t) => this.toDomain(t));
  }

  async findClosedByAccountIdInDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: {
        accountId,
        status: { in: ['WIN', 'LOSS', 'TIE'] },
        closedAt: { gte: startDate, lte: endDate, not: null },
      },
      orderBy: { closedAt: 'asc' },
    });
    return trades.map((t) => this.toDomain(t));
  }

  async updateResult(
    id: string,
    exitPrice: number,
    status: TradeStatus,
    closedAt: Date,
  ): Promise<Trade> {
    const prisma = getPrismaClient();
    const trade = await prisma.trade.update({
      where: { id },
      data: {
        exitPrice: new Prisma.Decimal(exitPrice),
        status: status as 'OPEN' | 'WIN' | 'LOSS' | 'TIE',
        closedAt,
      },
    });
    return this.toDomain(trade);
  }

  async createWithBalanceDeduction(
    tradeData: Omit<Trade, 'id' | 'openedAt'>,
    accountId: string,
    amount: number,
  ): Promise<Trade> {
    const prisma = getPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: accountId },
        select: { balance: true },
      });

      if (Number(account.balance) < amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: new Prisma.Decimal(amount) } },
      });

      return tx.trade.create({
        data: {
          userId: tradeData.userId,
          accountId: tradeData.accountId,
          direction: tradeData.direction as 'CALL' | 'PUT',
          instrument: tradeData.instrument,
          amount: new Prisma.Decimal(tradeData.amount),
          entryPrice: new Prisma.Decimal(tradeData.entryPrice),
          exitPrice: tradeData.exitPrice !== null ? new Prisma.Decimal(tradeData.exitPrice) : null,
          payout: new Prisma.Decimal(tradeData.payout),
          status: tradeData.status as 'OPEN' | 'WIN' | 'LOSS' | 'TIE',
          expiresAt: tradeData.expiresAt,
          closedAt: tradeData.closedAt,
        },
      });
    });

    return this.toDomain(result);
  }

  async closeWithBalanceCredit(
    tradeId: string,
    exitPrice: number,
    status: TradeStatus,
    closedAt: Date,
    accountId: string,
    balanceDelta: number,
  ): Promise<Trade> {
    const prisma = getPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.update({
        where: { id: tradeId },
        data: {
          exitPrice: new Prisma.Decimal(exitPrice),
          status: status as 'OPEN' | 'WIN' | 'LOSS' | 'TIE',
          closedAt,
        },
      });

      if (balanceDelta > 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
        });
      }

      return trade;
    });

    return this.toDomain(result);
  }

  private toDomain(trade: {
    id: string;
    userId: string;
    accountId: string;
    direction: string;
    instrument: string;
    amount: Prisma.Decimal | number;
    entryPrice: Prisma.Decimal | number;
    exitPrice: Prisma.Decimal | number | null;
    payout: Prisma.Decimal | number;
    status: string;
    openedAt: Date;
    expiresAt: Date;
    closedAt: Date | null;
  }): Trade {
    return {
      id: trade.id,
      userId: trade.userId,
      accountId: trade.accountId,
      direction: trade.direction as TradeDirection,
      instrument: trade.instrument,
      amount: toNumber(trade.amount),
      entryPrice: toNumber(trade.entryPrice),
      exitPrice: trade.exitPrice === null ? null : toNumber(trade.exitPrice),
      payout: toNumber(trade.payout),
      status: trade.status as TradeStatus,
      openedAt: trade.openedAt,
      expiresAt: trade.expiresAt,
      closedAt: trade.closedAt,
    };
  }
}
