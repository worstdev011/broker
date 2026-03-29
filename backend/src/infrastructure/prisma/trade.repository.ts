import type { Trade, Account } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";

export const tradeRepository = {
  async findById(id: string): Promise<Trade | null> {
    return prisma.trade.findUnique({ where: { id } });
  },

  async findByIdempotencyKey(key: string): Promise<Trade | null> {
    return prisma.trade.findFirst({ where: { idempotencyKey: key } });
  },

  /**
   * Opens a trade in a single atomic transaction:
   *   1. Deduct balance (with guard: balance >= amount)
   *   2. Create trade record
   *   3. Create TRADE_DEBIT ledger entry
   *
   * If balance is insufficient the updateMany returns count=0
   * and the whole transaction rolls back.
   */
  async openTrade(data: {
    userId: string;
    accountId: string;
    instrumentId: string;
    direction: "CALL" | "PUT";
    amount: number;
    entryPrice: number;
    payoutPercent: number;
    expiresAt: Date;
    idempotencyKey?: string;
  }): Promise<{ trade: Trade; account: Account }> {
    return prisma.$transaction(async (tx) => {
      const deducted = await tx.account.updateMany({
        where: { id: data.accountId, balance: { gte: data.amount } },
        data: { balance: { decrement: data.amount } },
      });

      if (deducted.count === 0) {
        throw AppError.badRequest("Insufficient balance");
      }

      const account = await tx.account.findUniqueOrThrow({
        where: { id: data.accountId },
      });

      const trade = await tx.trade.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          instrumentId: data.instrumentId,
          direction: data.direction,
          amount: data.amount,
          entryPrice: data.entryPrice,
          payoutPercent: data.payoutPercent,
          expiresAt: data.expiresAt,
          idempotencyKey: data.idempotencyKey ?? null,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: data.accountId,
          type: "TRADE_DEBIT",
          amount: data.amount,
          direction: "DEBIT",
          balanceAfter: account.balance,
          referenceId: trade.id,
          referenceType: "TRADE",
        },
      });

      return { trade, account };
    });
  },

  /**
   * Closes a trade in a single atomic transaction.
   * Uses WHERE status='OPEN' so a duplicate call is a harmless no-op.
   *
   * Returns the updated Account (for WS snapshot) when credits were
   * applied, or null when the trade was already closed or LOSS.
   */
  async closeTrade(data: {
    tradeId: string;
    exitPrice: number;
    status: "WIN" | "LOSS" | "TIE";
    payoutAmount: number;
    closedAt: Date;
    accountId: string;
    creditAmount: number;
  }): Promise<Account | null> {
    return prisma.$transaction(async (tx) => {
      const closed = await tx.trade.updateMany({
        where: { id: data.tradeId, status: "OPEN" },
        data: {
          status: data.status,
          exitPrice: data.exitPrice,
          closedAt: data.closedAt,
          payoutAmount: data.payoutAmount,
        },
      });

      if (closed.count === 0) return null;

      if (data.creditAmount > 0) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: data.creditAmount } },
        });

        const account = await tx.account.findUniqueOrThrow({
          where: { id: data.accountId },
        });

        await tx.ledgerEntry.create({
          data: {
            accountId: data.accountId,
            type: "TRADE_CREDIT",
            amount: data.creditAmount,
            direction: "CREDIT",
            balanceAfter: account.balance,
            referenceId: data.tradeId,
            referenceType: "TRADE",
          },
        });

        return account;
      }

      return null;
    });
  },

  async findByUserIdPaginated(
    userId: string,
    limit: number,
    offset: number,
    status?: "OPEN" | "WIN" | "LOSS" | "TIE" | "CLOSED",
    accountType?: "DEMO" | "REAL",
  ): Promise<Trade[]> {
    const statusFilter = status === "CLOSED"
      ? { status: { in: ["WIN", "LOSS", "TIE"] as ("WIN" | "LOSS" | "TIE")[] } }
      : status ? { status } : {};
    return prisma.trade.findMany({
      where: {
        userId,
        ...statusFilter,
        ...(accountType ? { account: { type: accountType } } : {}),
      },
      orderBy: { openedAt: "desc" },
      take: limit,
      skip: offset,
    });
  },

  async countByUserId(
    userId: string,
    status?: "OPEN" | "WIN" | "LOSS" | "TIE" | "CLOSED",
    accountType?: "DEMO" | "REAL",
  ): Promise<number> {
    const statusFilter = status === "CLOSED"
      ? { status: { in: ["WIN", "LOSS", "TIE"] as ("WIN" | "LOSS" | "TIE")[] } }
      : status ? { status } : {};
    return prisma.trade.count({
      where: {
        userId,
        ...statusFilter,
        ...(accountType ? { account: { type: accountType } } : {}),
      },
    });
  },

  async getClosedTradesStats(userId: string): Promise<
    { status: string; _count: number; _sumAmount: number; _sumPayout: number }[]
  > {
    const rows = await prisma.trade.groupBy({
      by: ["status"],
      where: { userId, status: { not: "OPEN" } },
      _count: { _all: true },
      _sum: { amount: true, payoutAmount: true },
    });

    return rows.map((r) => ({
      status: r.status,
      _count: r._count._all,
      _sumAmount: Number(r._sum.amount ?? 0),
      _sumPayout: Number(r._sum.payoutAmount ?? 0),
    }));
  },

  async getClosedTradesByUserIdWithDetails(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Trade[]> {
    const SAFETY_LIMIT = 10_000;

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: { not: "OPEN" },
        ...(startDate || endDate
          ? {
              closedAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { closedAt: "asc" },
      take: SAFETY_LIMIT,
    });

    if (trades.length === SAFETY_LIMIT) {
      logger.warn({ userId, startDate, endDate, count: trades.length }, "getClosedTradesByUserIdWithDetails hit safety limit — results may be truncated");
    }

    return trades;
  },
};
