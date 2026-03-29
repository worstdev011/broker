import { prisma } from "../../infrastructure/prisma/client.js";
import { partnerRepository } from "../../infrastructure/prisma/partner.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import { env } from "../../shared/types/env.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface PartnerDashboardDTO {
  refCode: string;
  refUrl: string;
  stats: {
    clicksTotal: number;
    clicksToday: number;
    clicksThisMonth: number;
    registrationsTotal: number;
    registrationsToday: number;
    registrationsThisMonth: number;
    ftdTotal: number;
    ftdToday: number;
    ftdThisMonth: number;
    conversionRate: number;
    earningsTotal: string;
    earningsToday: string;
    earningsThisMonth: string;
    balance: string;
    activeReferrals: number;
  };
  chartData: Array<{
    date: string;
    clicks: number;
    registrations: number;
    ftd: number;
    earnings: string;
  }>;
}

export interface PartnerReferralDTO {
  id: string;
  registeredAt: string;
  ftdAt: string | null;
  ftdAmount: string | null;
  totalDeposits: string;
  totalTrades: number;
  earned: string;
  lastActiveAt: string | null;
}

export interface PartnerEarningDTO {
  id: string;
  amount: string;
  referralId: string;
  createdAt: string;
}

export interface PartnerWithdrawalDTO {
  id: string;
  amount: string;
  status: "PENDING" | "PAID" | "REJECTED";
  paymentMethod: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const partnerService = {
  async getDashboard(partnerId: string): Promise<PartnerDashboardDTO> {
    const partner = await partnerRepository.findById(partnerId);
    if (!partner) throw AppError.notFound("Partner not found");

    const config = env();
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const last30 = daysAgo(30);

    // ── Run all stat queries in parallel ──────────────────────────────────────
    const [
      clicksTotal,
      clicksToday,
      clicksThisMonth,
      registrationsTotal,
      registrationsToday,
      registrationsThisMonth,
      ftdTotal,
      ftdToday,
      ftdThisMonth,
      earningsTotalRaw,
      earningsTodayRaw,
      earningsThisMonthRaw,
      activeReferrals,
      // Chart-window raw data (last 30 days)
      chartClicks,
      chartEvents,
      chartEarnings,
    ] = await Promise.all([
      // Clicks
      prisma.partnerClick.count({ where: { partnerId } }),
      prisma.partnerClick.count({ where: { partnerId, createdAt: { gte: todayStart } } }),
      prisma.partnerClick.count({ where: { partnerId, createdAt: { gte: monthStart } } }),

      // Registrations
      prisma.partnerEvent.count({ where: { partnerId, type: "REGISTRATION" } }),
      prisma.partnerEvent.count({ where: { partnerId, type: "REGISTRATION", createdAt: { gte: todayStart } } }),
      prisma.partnerEvent.count({ where: { partnerId, type: "REGISTRATION", createdAt: { gte: monthStart } } }),

      // FTD
      prisma.partnerEvent.count({ where: { partnerId, type: "FTD" } }),
      prisma.partnerEvent.count({ where: { partnerId, type: "FTD", createdAt: { gte: todayStart } } }),
      prisma.partnerEvent.count({ where: { partnerId, type: "FTD", createdAt: { gte: monthStart } } }),

      // Earnings sums
      prisma.partnerEarning.aggregate({ where: { partnerId }, _sum: { amount: true } }),
      prisma.partnerEarning.aggregate({ where: { partnerId, createdAt: { gte: todayStart } }, _sum: { amount: true } }),
      prisma.partnerEarning.aggregate({ where: { partnerId, createdAt: { gte: monthStart } }, _sum: { amount: true } }),

      // Active referrals: users linked to partner who have at least one trade in last 30d
      prisma.user.count({
        where: {
          partnerId,
          trades: { some: { openedAt: { gte: last30 } } },
        },
      }),

      // Chart data (last 30 days)
      prisma.partnerClick.findMany({
        where: { partnerId, createdAt: { gte: last30 } },
        select: { createdAt: true },
      }),
      prisma.partnerEvent.findMany({
        where: { partnerId, type: { in: ["REGISTRATION", "FTD"] }, createdAt: { gte: last30 } },
        select: { createdAt: true, type: true },
      }),
      prisma.partnerEarning.findMany({
        where: { partnerId, createdAt: { gte: last30 } },
        select: { createdAt: true, amount: true },
      }),
    ]);

    // ── Build chart map (30 date keys) ────────────────────────────────────────
    const chartMap = new Map<string, { clicks: number; registrations: number; ftd: number; earnings: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      chartMap.set(isoDate(d), { clicks: 0, registrations: 0, ftd: 0, earnings: 0 });
    }

    for (const c of chartClicks) {
      const key = isoDate(startOfDay(c.createdAt));
      const entry = chartMap.get(key);
      if (entry) entry.clicks++;
    }
    for (const e of chartEvents) {
      const key = isoDate(startOfDay(e.createdAt));
      const entry = chartMap.get(key);
      if (!entry) continue;
      if (e.type === "REGISTRATION") entry.registrations++;
      else if (e.type === "FTD") entry.ftd++;
    }
    for (const e of chartEarnings) {
      const key = isoDate(startOfDay(e.createdAt));
      const entry = chartMap.get(key);
      if (entry) entry.earnings += Number(e.amount);
    }

    const chartData = Array.from(chartMap.entries()).map(([date, v]) => ({
      date,
      clicks: v.clicks,
      registrations: v.registrations,
      ftd: v.ftd,
      earnings: v.earnings.toFixed(2),
    }));

    const conversionRate =
      registrationsTotal > 0
        ? Math.round((ftdTotal / registrationsTotal) * 100 * 100) / 100
        : 0;

    return {
      refCode: partner.refCode,
      refUrl: `${config.FRONTEND_URL}?ref=${partner.refCode}`,
      stats: {
        clicksTotal,
        clicksToday,
        clicksThisMonth,
        registrationsTotal,
        registrationsToday,
        registrationsThisMonth,
        ftdTotal,
        ftdToday,
        ftdThisMonth,
        conversionRate,
        earningsTotal: (Number(earningsTotalRaw._sum.amount ?? 0)).toFixed(2),
        earningsToday: (Number(earningsTodayRaw._sum.amount ?? 0)).toFixed(2),
        earningsThisMonth: (Number(earningsThisMonthRaw._sum.amount ?? 0)).toFixed(2),
        balance: partner.balance.toString(),
        activeReferrals,
      },
      chartData,
    };
  },

  async getReferrals(
    partnerId: string,
    page: number,
    limit: number,
  ): Promise<{ referrals: PartnerReferralDTO[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: { id: true, createdAt: true },
      }),
      prisma.user.count({ where: { partnerId } }),
    ]);

    if (users.length === 0) {
      return { referrals: [], total, page, totalPages: Math.ceil(total / limit) };
    }

    const userIds = users.map((u) => u.id);

    // Fetch all supplemental data in parallel
    const [ftdEvents, depositSums, tradeCounts, earningSums, lastTrades] =
      await Promise.all([
        // FTD events
        prisma.partnerEvent.findMany({
          where: { partnerId, userId: { in: userIds }, type: "FTD" },
          select: { userId: true, createdAt: true, amount: true },
        }),
        // Confirmed deposit totals per user
        prisma.transaction.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, type: "DEPOSIT", status: "CONFIRMED" },
          _sum: { amount: true },
        }),
        // Trade counts per user
        prisma.trade.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _count: { _all: true },
        }),
        // Earnings per user (sum)
        prisma.partnerEarning.groupBy({
          by: ["userId"],
          where: { partnerId, userId: { in: userIds } },
          _sum: { amount: true },
        }),
        // Last trade date per user
        prisma.trade.findMany({
          where: { userId: { in: userIds }, status: { not: "OPEN" } },
          orderBy: { closedAt: "desc" },
          select: { userId: true, closedAt: true },
          distinct: ["userId"],
        }),
      ]);

    // Build lookup maps
    const ftdMap = new Map(ftdEvents.map((e) => [e.userId, e]));
    const depositMap = new Map(depositSums.map((d) => [d.userId, d._sum.amount ?? 0]));
    const tradeMap = new Map(tradeCounts.map((t) => [t.userId, t._count._all]));
    const earningMap = new Map(earningSums.map((e) => [e.userId, e._sum.amount ?? 0]));
    const lastTradeMap = new Map(lastTrades.map((t) => [t.userId, t.closedAt]));

    const referrals: PartnerReferralDTO[] = users.map((u) => {
      const ftd = ftdMap.get(u.id);
      return {
        id: u.id,
        registeredAt: u.createdAt.toISOString(),
        ftdAt: ftd ? ftd.createdAt.toISOString() : null,
        ftdAmount: ftd ? Number(ftd.amount ?? 0).toFixed(2) : null,
        totalDeposits: Number(depositMap.get(u.id) ?? 0).toFixed(2),
        totalTrades: tradeMap.get(u.id) ?? 0,
        earned: Number(earningMap.get(u.id) ?? 0).toFixed(2),
        lastActiveAt: lastTradeMap.get(u.id)?.toISOString() ?? null,
      };
    });

    return {
      referrals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getEarnings(
    partnerId: string,
    page: number,
    limit: number,
  ): Promise<{ earnings: PartnerEarningDTO[]; total: number; totalAmount: string }> {
    const offset = (page - 1) * limit;

    const [earnings, total, totalAmountRaw] = await Promise.all([
      prisma.partnerEarning.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.partnerEarning.count({ where: { partnerId } }),
      prisma.partnerEarning.aggregate({ where: { partnerId }, _sum: { amount: true } }),
    ]);

    return {
      earnings: earnings.map((e) => ({
        id: e.id,
        amount: e.amount.toString(),
        referralId: e.userId,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      totalAmount: Number(totalAmountRaw._sum.amount ?? 0).toFixed(2),
    };
  },

  async getWithdrawals(
    partnerId: string,
  ): Promise<{ withdrawals: PartnerWithdrawalDTO[]; balance: string }> {
    const [partner, withdrawals] = await Promise.all([
      partnerRepository.findById(partnerId),
      prisma.partnerWithdrawal.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!partner) throw AppError.notFound("Partner not found");

    return {
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount.toString(),
        status: w.status,
        paymentMethod: w.paymentMethod,
        note: w.note,
        createdAt: w.createdAt.toISOString(),
        paidAt: w.paidAt?.toISOString() ?? null,
      })),
      balance: partner.balance.toString(),
    };
  },

  async requestWithdrawal(
    partnerId: string,
    amount: number,
    paymentMethod: string,
  ): Promise<PartnerWithdrawalDTO> {
    const MIN_WITHDRAWAL = 500;

    if (amount < MIN_WITHDRAWAL) {
      throw AppError.badRequest(`Minimum withdrawal amount is ${MIN_WITHDRAWAL} UAH`);
    }

    const partner = await partnerRepository.findById(partnerId);
    if (!partner) throw AppError.notFound("Partner not found");

    if (amount > Number(partner.balance)) {
      throw AppError.badRequest("Insufficient balance");
    }

    const pending = await prisma.partnerWithdrawal.findFirst({
      where: { partnerId, status: "PENDING" },
    });
    if (pending) {
      throw AppError.badRequest("You already have a pending withdrawal request");
    }

    // Atomic: create withdrawal + freeze (decrement) balance
    const withdrawal = await prisma.$transaction(async (tx) => {
      const updated = await tx.partner.updateMany({
        where: { id: partnerId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });

      if (updated.count === 0) {
        throw AppError.badRequest("Insufficient balance");
      }

      return tx.partnerWithdrawal.create({
        data: {
          partnerId,
          amount,
          status: "PENDING",
          paymentMethod,
        },
      });
    });

    return {
      id: withdrawal.id,
      amount: withdrawal.amount.toString(),
      status: withdrawal.status,
      paymentMethod: withdrawal.paymentMethod,
      note: withdrawal.note,
      createdAt: withdrawal.createdAt.toISOString(),
      paidAt: withdrawal.paidAt?.toISOString() ?? null,
    };
  },
};
