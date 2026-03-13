import type { FastifyRequest, FastifyReply } from 'fastify';
import { TradeService } from '../../domain/trades/TradeService.js';
import { TradeDirection, type Trade, type TradeDTO } from '../../domain/trades/TradeTypes.js';
import { emitTradeOpen, emitAccountSnapshot } from '../../bootstrap/websocket.bootstrap.js';
import { registerTradeForCountdown } from '../../bootstrap/time.bootstrap.js';
import { logger } from '../../shared/logger.js';
import { AccountService } from '../../domain/accounts/AccountService.js';

function tradeToDTO(trade: Trade): TradeDTO {
  return {
    id: trade.id,
    accountId: trade.accountId,
    direction: trade.direction,
    instrument: trade.instrument,
    amount: trade.amount.toString(),
    entryPrice: trade.entryPrice.toString(),
    exitPrice: trade.exitPrice !== null ? trade.exitPrice.toString() : null,
    payout: trade.payout.toString(),
    status: trade.status,
    openedAt: trade.openedAt.toISOString(),
    expiresAt: trade.expiresAt.toISOString(),
    closedAt: trade.closedAt !== null ? trade.closedAt.toISOString() : null,
  };
}

function parseDateRange(
  rawStart?: string,
  rawEnd?: string,
): { startDate: Date; endDate: Date } | { error: string } {
  if (rawStart && rawEnd) {
    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { error: 'Dates must be in YYYY-MM-DD format' };
    }
    if (startDate > endDate) {
      return { error: 'Start date must be before end date' };
    }
    return { startDate, endDate };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

export class TradesController {
  constructor(
    private tradeService: TradeService,
    private accountService: AccountService,
  ) {}

  async openTrade(
    request: FastifyRequest<{
      Body: {
        accountId: string;
        direction: 'CALL' | 'PUT';
        amount: number;
        expirationSeconds: number;
        instrument: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { accountId, direction, amount, expirationSeconds, instrument } = request.body;

    const trade = await this.tradeService.openTrade({
      userId,
      accountId,
      direction: direction === 'CALL' ? TradeDirection.CALL : TradeDirection.PUT,
      amount,
      expirationSeconds,
      instrument,
    });

    const dto = tradeToDTO(trade);

    try {
      emitTradeOpen(dto, userId);
      registerTradeForCountdown(trade.id, userId, trade.expiresAt.getTime());

      const snapshot = await this.accountService.getAccountSnapshot(userId);
      if (snapshot) {
        emitAccountSnapshot(userId, {
          ...snapshot,
          currency: snapshot.currency as 'USD' | 'RUB' | 'UAH',
        });
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to emit WebSocket events after trade open');
    }

    return reply.status(201).send({ trade: dto });
  }

  async getTrades(
    request: FastifyRequest<{
      Querystring: { limit?: string; offset?: string; status?: 'open' | 'closed' };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const limit = Math.min(Number(request.query.limit) || 50, 100);
    const offset = Number(request.query.offset) || 0;
    const status = request.query.status ?? 'open';

    const { trades, hasMore } = await this.tradeService.getTradesPaginated(userId, status, limit, offset);

    return reply.send({
      trades: trades.map(tradeToDTO),
      hasMore,
    });
  }

  async getStatistics(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const statistics = await this.tradeService.getTradeStatistics(userId);
    return reply.send({ statistics });
  }

  async getBalanceHistory(
    request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const range = parseDateRange(request.query.startDate, request.query.endDate);
    if ('error' in range) {
      return reply.status(400).send({ error: 'INVALID_DATE_RANGE', message: range.error });
    }

    const history = await this.tradeService.getBalanceHistory(userId, range.startDate, range.endDate);
    return reply.send({ history });
  }

  async getAnalytics(
    request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const range = parseDateRange(request.query.startDate, request.query.endDate);
    if ('error' in range) {
      return reply.status(400).send({ error: 'INVALID_DATE_RANGE', message: range.error });
    }

    const analytics = await this.tradeService.getTradeAnalytics(userId, range.startDate, range.endDate);
    return reply.send({ analytics });
  }
}
