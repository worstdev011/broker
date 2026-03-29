import { z } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";
import { adminService } from "../../domain/admin/admin.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { prisma } from "../../infrastructure/prisma/client.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const userIdParamsSchema = z.object({ id: z.string() });

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const banBodySchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

const balanceBodySchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  direction: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().min(1, "Reason is required"),
});

const kycBodySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "PENDING"]),
});

const listTradesQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["OPEN", "WIN", "LOSS", "TIE"]).optional(),
  instrument: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const adminController = {
  async handleDashboard(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await adminService.getDashboard();
    reply.send(result);
  },

  async handleListUsers(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const q = listUsersQuerySchema.parse(request.query);
    const result = await adminService.getUsers(q.search, q.page, q.limit);
    reply.send(result);
  },

  async handleGetUser(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    const result = await adminService.getUserDetail(id);
    reply.send(result);
  },

  async handleBanUser(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    const { reason } = banBodySchema.parse(request.body);
    if (!request.userId) throw AppError.unauthorized();
    const result = await adminService.banUser(request.userId, id, reason);
    reply.send(result);
  },

  async handleUnbanUser(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    if (!request.userId) throw AppError.unauthorized();
    const result = await adminService.unbanUser(request.userId, id);
    reply.send(result);
  },

  async handleAdjustBalance(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    const body = balanceBodySchema.parse(request.body);
    if (!request.userId) throw AppError.unauthorized();
    const result = await adminService.adjustBalance(
      request.userId,
      id,
      body.accountId,
      body.amount,
      body.direction,
      body.reason,
    );
    reply.send(result);
  },

  async handleUpdateKyc(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    const { status } = kycBodySchema.parse(request.body);
    if (!request.userId) throw AppError.unauthorized();
    const result = await adminService.updateKyc(request.userId, id, status);
    reply.send(result);
  },

  async handleKillUserSessions(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    if (!request.userId) throw AppError.unauthorized();
    const result = await adminService.killUserSessions(request.userId, id);
    reply.send(result);
  },

  async handleReset2FA(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = userIdParamsSchema.parse(request.params);
    if (!request.userId) throw AppError.unauthorized();
    const result = await adminService.reset2FA(request.userId, id);
    reply.send(result);
  },

  async handleListTrades(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const q = listTradesQuerySchema.parse(request.query);
    const result = await adminService.getTrades({
      userId: q.userId,
      status: q.status,
      instrument: q.instrument,
      page: q.page,
      limit: q.limit,
    });
    reply.send(result);
  },

  async handleActiveTrades(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await adminService.getActiveTrades();
    reply.send(result);
  },

  async handleListInstruments(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await adminService.getInstruments();
    reply.send(result);
  },

  async handleSessions(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await adminService.getSessions();
    reply.send(result);
  },

  // ─── Partners ──────────────────────────────────────────────────────────────

  async handleListPartners(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const q = z.object({
      page:  z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
      search: z.string().optional(),
    }).parse(request.query);

    const where = q.search
      ? { OR: [{ email: { contains: q.search } }, { refCode: { contains: q.search } }] }
      : {};

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          refCode: true, status: true, revsharePercent: true,
          balance: true, totalEarned: true, createdAt: true,
          _count: { select: { referrals: true } },
        },
      }),
      prisma.partner.count({ where }),
    ]);

    reply.send({
      partners: partners.map((p) => ({
        ...p,
        balance: p.balance.toString(),
        totalEarned: p.totalEarned.toString(),
        referralCount: p._count.referrals,
      })),
      total,
      page: q.page,
      totalPages: Math.ceil(total / q.limit),
    });
  },

  async handleSetPartnerStatus(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { status } = z.object({
      status: z.enum(["ACTIVE", "SUSPENDED"]),
    }).parse(request.body);

    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) throw AppError.notFound("Partner not found");

    const updated = await prisma.partner.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    });
    reply.send(updated);
  },

  async handleListPartnerWithdrawals(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const q = z.object({
      status: z.enum(["PENDING", "PAID", "REJECTED"]).optional(),
      page:  z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query);

    const where = q.status ? { status: q.status } : {};

    const [withdrawals, total] = await Promise.all([
      prisma.partnerWithdrawal.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: "desc" },
        include: { partner: { select: { id: true, email: true, refCode: true } } },
      }),
      prisma.partnerWithdrawal.count({ where }),
    ]);

    reply.send({
      withdrawals: withdrawals.map((w) => ({
        ...w,
        amount: w.amount.toString(),
      })),
      total,
      page: q.page,
      totalPages: Math.ceil(total / q.limit),
    });
  },

  async handlePayWithdrawal(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const wd = await prisma.partnerWithdrawal.findUnique({ where: { id } });
    if (!wd) throw AppError.notFound("Withdrawal not found");
    if (wd.status !== "PENDING") {
      throw new AppError("ALREADY_PROCESSED", "Withdrawal is not in PENDING status", 400);
    }

    const updated = await prisma.partnerWithdrawal.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
    reply.send({ ...updated, amount: updated.amount.toString() });
  },

  async handleRejectWithdrawal(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { note } = z.object({ note: z.string().min(1) }).parse(request.body);

    const wd = await prisma.partnerWithdrawal.findUnique({ where: { id } });
    if (!wd) throw AppError.notFound("Withdrawal not found");
    if (wd.status !== "PENDING") {
      throw new AppError("ALREADY_PROCESSED", "Withdrawal is not in PENDING status", 400);
    }

    // Return funds to partner balance
    await prisma.$transaction([
      prisma.partnerWithdrawal.update({
        where: { id },
        data: { status: "REJECTED", note },
      }),
      prisma.partner.update({
        where: { id: wd.partnerId },
        data: { balance: { increment: wd.amount } },
      }),
    ]);

    reply.send({ success: true });
  },
};
