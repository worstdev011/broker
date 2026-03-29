import { prisma } from "../../infrastructure/prisma/client.js";
import type { Trade, Transaction } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";
import { wsManager } from "../../websocket/ws.manager.js";
import { sendAccountSnapshot } from "../../shared/websocket/ws.events.js";
import { toAccountDTO } from "../../shared/dto/account.dto.js";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface AdminUserDTO {
  id: string;
  email: string;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  kycStatus: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  realBalance: string;
  demoBalance: string;
}

export interface AdminUserDetailDTO extends AdminUserDTO {
  phone: string | null;
  country: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  currency: string;
  googleId: string | null;
  kycApplicantId: string | null;
  lastLoginAt: string | null;
  ipAddress: string | null;
}

export interface AdminAccountDTO {
  id: string;
  type: "DEMO" | "REAL";
  balance: string;
  currency: string;
  isActive: boolean;
}

export interface AdminTradeDTO {
  id: string;
  userId: string;
  userEmail: string;
  instrument: string;
  direction: "CALL" | "PUT";
  amount: string;
  entryPrice: string;
  exitPrice: string | null;
  payoutPercent: number;
  payoutAmount: string | null;
  status: "OPEN" | "WIN" | "LOSS" | "TIE";
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
}

export interface AdminTransactionDTO {
  id: string;
  userId: string;
  userEmail: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  status: "PENDING" | "CONFIRMED" | "FAILED";
  amount: string;
  currency: string;
  paymentMethod: string;
  cardLastFour: string | null;
  externalId: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface AdminSessionDTO {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface AdminInstrumentDTO {
  id: string;
  name: string;
  base: string;
  quote: string;
  type: "REAL" | "OTC";
  isActive: boolean;
  payoutPercent: number;
  sortOrder: number;
}

// ─── Internal helper types ─────────────────────────────────────────────────────

type TradeWithIncludes = Trade & {
  user: { email: string };
  instrument: { name: string };
};

type TransactionWithUser = Transaction & {
  user: { email: string };
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const adminService = {
  async getDashboard() {
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [
      usersTotal,
      usersToday,
      tradesOpenNow,
      tradesToday,
      volumeTodayAgg,
      depositsTodayAgg,
      withdrawalsTodayAgg,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.trade.count({ where: { status: "OPEN" } }),
      prisma.trade.count({ where: { openedAt: { gte: startOfDay } } }),
      prisma.trade.aggregate({
        where: { openedAt: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "DEPOSIT",
          status: "CONFIRMED",
          confirmedAt: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "WITHDRAWAL",
          status: "CONFIRMED",
          confirmedAt: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: { type: "WITHDRAWAL", status: "PENDING" },
      }),
    ]);

    return {
      stats: {
        usersTotal,
        usersToday,
        activeNow: wsManager.getTotalConnections(),
        tradesOpenNow,
        tradesToday,
        volumeToday: Number(volumeTodayAgg._sum.amount ?? 0),
        depositsToday: Number(depositsTodayAgg._sum.amount ?? 0),
        withdrawalsToday: Number(withdrawalsTodayAgg._sum.amount ?? 0),
        pendingWithdrawals,
      },
    };
  },

  async getUsers(search?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { id: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
            { nickname: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { accounts: { select: { type: true, balance: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    const dtos: AdminUserDTO[] = users.map((u) => {
      const realAcc = u.accounts.find((a) => a.type === "REAL");
      const demoAcc = u.accounts.find((a) => a.type === "DEMO");
      return {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        kycStatus: u.kycStatus,
        twoFactorEnabled: u.twoFactorEnabled,
        createdAt: u.createdAt.toISOString(),
        realBalance: realAcc ? realAcc.balance.toString() : "0.00",
        demoBalance: demoAcc ? demoAcc.balance.toString() : "0.00",
      };
    });

    return { users: dtos, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getUserDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true,
        sessions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!user) throw AppError.notFound("User not found");

    const lastSession = user.sessions[0] ?? null;
    const activeSessions = user.sessions.filter((s) => s.expiresAt > new Date());

    const [
      tradeStats,
      volumeAgg,
      depositAgg,
      withdrawAgg,
      recentTrades,
      recentTransactions,
    ] = await Promise.all([
      prisma.trade.groupBy({
        by: ["status"],
        where: { userId: id, status: { not: "OPEN" } },
        _count: { _all: true },
      }),
      prisma.trade.aggregate({
        where: { userId: id },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: id, type: "DEPOSIT", status: "CONFIRMED" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: id, type: "WITHDRAWAL", status: "CONFIRMED" },
        _sum: { amount: true },
      }),
      prisma.trade.findMany({
        where: { userId: id },
        include: {
          user: { select: { email: true } },
          instrument: { select: { name: true } },
        },
        orderBy: { openedAt: "desc" },
        take: 20,
      }),
      prisma.transaction.findMany({
        where: { userId: id },
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const totalClosed = tradeStats.reduce((s, r) => s + r._count._all, 0);
    const winCount = tradeStats.find((r) => r.status === "WIN")?._count._all ?? 0;
    const winRate = totalClosed > 0 ? winCount / totalClosed : 0;

    const detailDTO: AdminUserDetailDTO = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      kycStatus: user.kycStatus,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      realBalance:
        (user.accounts.find((a) => a.type === "REAL")?.balance ?? 0).toString(),
      demoBalance:
        (user.accounts.find((a) => a.type === "DEMO")?.balance ?? 0).toString(),
      phone: user.phone,
      country: user.country,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
      avatarUrl: user.avatarUrl,
      currency: user.currency,
      googleId: user.googleId,
      kycApplicantId: user.kycApplicantId,
      lastLoginAt: lastSession ? lastSession.createdAt.toISOString() : null,
      ipAddress: lastSession ? lastSession.ipAddress : null,
    };

    const accounts: AdminAccountDTO[] = user.accounts.map((a) => ({
      id: a.id,
      type: a.type,
      balance: a.balance.toString(),
      currency: a.currency,
      isActive: a.isActive,
    }));

    const sessionDTOs: AdminSessionDTO[] = activeSessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));

    return {
      user: detailDTO,
      accounts,
      stats: {
        totalTrades: totalClosed,
        winRate,
        totalVolume: Number(volumeAgg._sum.amount ?? 0),
        totalDeposits: Number(depositAgg._sum.amount ?? 0),
        totalWithdrawals: Number(withdrawAgg._sum.amount ?? 0),
      },
      recentTrades: recentTrades.map((t) =>
        toTradeDTO(t, t.user.email, t.instrument.name),
      ),
      recentTransactions: recentTransactions.map((t) =>
        toTransactionDTO(t, t.user.email),
      ),
      activeSessions: sessionDTOs,
    };
  },

  async banUser(adminId: string, userId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await prisma.session.deleteMany({ where: { userId } });
    wsManager.disconnectUser(userId);

    logger.info(
      { adminId, action: "BAN_USER", targetUserId: userId, details: { reason } },
      "Admin action",
    );
    return { success: true };
  },

  async unbanUser(adminId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    logger.info(
      { adminId, action: "UNBAN_USER", targetUserId: userId, details: {} },
      "Admin action",
    );
    return { success: true };
  },

  async adjustBalance(
    adminId: string,
    userId: string,
    accountId: string,
    amount: number,
    direction: "CREDIT" | "DEBIT",
    reason: string,
  ) {
    if (amount <= 0) throw AppError.badRequest("Amount must be positive");
    if (!reason.trim()) throw AppError.badRequest("Reason is required");

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account)
      throw AppError.notFound("Account not found or does not belong to user");

    if (direction === "DEBIT" && Number(account.balance) < amount) {
      throw AppError.badRequest("Insufficient balance for debit");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.account.update({
        where: { id: accountId },
        data: {
          balance:
            direction === "CREDIT"
              ? { increment: amount }
              : { decrement: amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId,
          type: direction === "CREDIT" ? "BONUS" : "REFUND",
          amount,
          direction,
          balanceAfter: Number(acc.balance),
          description: `Admin: ${reason}`,
        },
      });

      return acc;
    });

    sendAccountSnapshot(userId, toAccountDTO(updated));

    logger.info(
      {
        adminId,
        action: "CHANGE_BALANCE",
        targetUserId: userId,
        details: { accountId, amount, direction, reason },
      },
      "Admin action",
    );

    return { success: true, newBalance: updated.balance.toString() };
  },

  async updateKyc(
    adminId: string,
    userId: string,
    status: "VERIFIED" | "REJECTED" | "PENDING",
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: status },
    });

    logger.info(
      { adminId, action: "UPDATE_KYC", targetUserId: userId, details: { status } },
      "Admin action",
    );
    return { success: true };
  },

  async killUserSessions(adminId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    await prisma.session.deleteMany({ where: { userId } });
    wsManager.disconnectUser(userId);

    logger.info(
      { adminId, action: "KILL_SESSIONS", targetUserId: userId, details: {} },
      "Admin action",
    );
    return { success: true };
  },

  async reset2FA(adminId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    logger.info(
      { adminId, action: "RESET_2FA", targetUserId: userId, details: {} },
      "Admin action",
    );
    return { success: true };
  },

  async getTrades(filters: {
    userId?: string;
    status?: "OPEN" | "WIN" | "LOSS" | "TIE";
    instrument?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const where = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.instrument ? { instrumentId: filters.instrument } : {}),
    };

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: { select: { email: true } },
          instrument: { select: { name: true } },
        },
        orderBy: { openedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count({ where }),
    ]);

    return {
      trades: trades.map((t) => toTradeDTO(t, t.user.email, t.instrument.name)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getActiveTrades() {
    const trades = await prisma.trade.findMany({
      where: { status: "OPEN" },
      include: {
        user: { select: { email: true } },
        instrument: { select: { name: true } },
      },
      orderBy: { openedAt: "desc" },
    });

    return {
      trades: trades.map((t) => toTradeDTO(t, t.user.email, t.instrument.name)),
    };
  },

  async getInstruments() {
    const instruments = await prisma.instrument.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return {
      instruments: instruments.map(
        (i): AdminInstrumentDTO => ({
          id: i.id,
          name: i.name,
          base: i.base,
          quote: i.quote,
          type: i.type,
          isActive: i.isActive,
          payoutPercent: i.payoutPercent,
          sortOrder: i.sortOrder,
        }),
      ),
    };
  },

  async getSessions() {
    const connections = wsManager.getConnectionsInfo();
    const userIds = [...new Set(connections.map((c) => c.userId))];

    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : [];

    const emailMap = new Map(users.map((u) => [u.id, u.email]));

    return {
      activeConnections: connections.length,
      connections: connections.map((c) => ({
        userId: c.userId,
        email: emailMap.get(c.userId) ?? "unknown",
        connectedAt: c.connectedAt,
        subscriptions: c.subscriptions,
      })),
    };
  },
};

// ─── Pure DTO helpers ─────────────────────────────────────────────────────────

function toTradeDTO(
  t: TradeWithIncludes,
  userEmail: string,
  instrumentName: string,
): AdminTradeDTO {
  return {
    id: t.id,
    userId: t.userId,
    userEmail,
    instrument: instrumentName,
    direction: t.direction,
    amount: t.amount.toString(),
    entryPrice: t.entryPrice.toString(),
    exitPrice: t.exitPrice ? t.exitPrice.toString() : null,
    payoutPercent: t.payoutPercent,
    payoutAmount: t.payoutAmount ? t.payoutAmount.toString() : null,
    status: t.status,
    openedAt: t.openedAt.toISOString(),
    expiresAt: t.expiresAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

function toTransactionDTO(
  t: TransactionWithUser,
  userEmail: string,
): AdminTransactionDTO {
  return {
    id: t.id,
    userId: t.userId,
    userEmail,
    type: t.type,
    status: t.status,
    amount: t.amount.toString(),
    currency: t.currency,
    paymentMethod: t.paymentMethod,
    cardLastFour: t.cardLastFour,
    externalId: t.externalId,
    createdAt: t.createdAt.toISOString(),
    confirmedAt: t.confirmedAt ? t.confirmedAt.toISOString() : null,
  };
}
