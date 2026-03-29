import type { FastifyRequest, FastifyReply } from "fastify";
import { tradeService } from "../../domain/trades/trade.service.js";
import {
  openTradeBodySchema,
  listTradesQuerySchema,
  balanceHistoryQuerySchema,
  analyticsQuerySchema,
} from "./trades.schema.js";
import { AppError } from "../../shared/errors/AppError.js";

function requireUserId(request: FastifyRequest): string {
  if (!request.userId) throw AppError.unauthorized();
  return request.userId;
}

export const tradesController = {
  async handleOpen(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = requireUserId(request);
    const body = openTradeBodySchema.parse(request.body);

    const trade = await tradeService.openTrade({
      userId,
      accountId: body.accountId,
      direction: body.direction,
      amount: body.amount,
      expirationSeconds: body.expirationSeconds,
      instrumentId: body.instrument,
      idempotencyKey: body.idempotencyKey,
    });

    reply.status(201).send({ trade });
  },

  async handleList(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = requireUserId(request);
    const raw = listTradesQuerySchema.parse(request.query);

    const limit = Math.min(Math.max(parseInt(raw.limit ?? "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(raw.offset ?? "0", 10) || 0, 0);

    const result = await tradeService.listTrades(userId, limit, offset, raw.status, raw.accountType);
    reply.send(result);
  },

  async handleStatistics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = requireUserId(request);
    const stats = await tradeService.getStatistics(userId);
    reply.send(stats);
  },

  async handleBalanceHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = requireUserId(request);
    const raw = balanceHistoryQuerySchema.parse(request.query);

    const startDate = new Date(raw.startDate);
    const endDate = new Date(raw.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw AppError.badRequest("Invalid date format");
    }

    const result = await tradeService.getBalanceHistory(userId, raw.accountId, startDate, endDate);
    reply.send(result);
  },

  async handleAnalytics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = requireUserId(request);
    const raw = analyticsQuerySchema.parse(request.query);

    const startDate = new Date(raw.startDate);
    const endDate = new Date(raw.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw AppError.badRequest("Invalid date format");
    }

    const result = await tradeService.getAnalytics(userId, startDate, endDate);
    reply.send(result);
  },
};
