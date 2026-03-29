import { tradeRepository } from "../../infrastructure/prisma/trade.repository.js";
import { ledgerRepository } from "../../infrastructure/prisma/ledger.repository.js";
import { accountRepository } from "../../infrastructure/prisma/account.repository.js";
import { instrumentRepository } from "../../infrastructure/prisma/instrument.repository.js";
import { isMarketOpen } from "../instruments/instrument.service.js";
import { priceProvider } from "../../prices/PriceProvider.js";
import { getRedis } from "../../bootstrap/redis.js";
import { getTradeClosingQueue } from "../../jobs/queues.js";
import { toTradeDTO, type TradeDTO } from "../../shared/dto/trade.dto.js";
import { toAccountDTO } from "../../shared/dto/account.dto.js";
import { sendTradeOpen, sendAccountSnapshot } from "../../shared/websocket/ws.events.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_KEY_TTL,
  ACTIVE_TRADES_PREFIX,
  MAX_ACTIVE_TRADES,
  TRADE_CLOSING_MAX_RETRIES,
  TRADE_CLOSING_BACKOFF_MS,
} from "./trade.constants.js";

export const tradeService = {
  async openTrade(data: {
    userId: string;
    accountId: string;
    direction: "CALL" | "PUT";
    amount: number;
    expirationSeconds: number;
    instrumentId: string;
    idempotencyKey?: string;
  }): Promise<TradeDTO> {
    const redis = getRedis();

    // 1. Idempotency — return existing trade if key was already used
    if (data.idempotencyKey) {
      const existingTradeId = await redis.get(
        `${IDEMPOTENCY_KEY_PREFIX}${data.idempotencyKey}`,
      );
      if (existingTradeId) {
        const existing = await tradeRepository.findById(existingTradeId);
        if (existing) return toTradeDTO(existing);
      }
    }

    // 2. Validate instrument exists and is active
    const instrument = await instrumentRepository.findById(data.instrumentId);
    if (!instrument || !instrument.isActive) {
      throw AppError.badRequest("Instrument not found or inactive");
    }

    // 3. Market hours check for REAL instruments
    if (!isMarketOpen(instrument.type)) {
      throw AppError.badRequest("Market is closed");
    }

    // 4. Validate account ownership
    const account = await accountRepository.findById(data.accountId);
    if (!account || account.userId !== data.userId) {
      throw AppError.forbidden("Account does not belong to this user");
    }

    // 5. Limit concurrent open trades
    const activeCount = await redis.scard(`${ACTIVE_TRADES_PREFIX}${data.userId}`);
    if (activeCount >= MAX_ACTIVE_TRADES) {
      throw AppError.badRequest(`Maximum ${MAX_ACTIVE_TRADES} active trades allowed`);
    }

    // 6. Pre-check balance (definitive check happens atomically inside the transaction)
    if (Number(account.balance) < data.amount) {
      throw AppError.badRequest("Insufficient balance");
    }

    // 6. Capture entry price from live price engine
    const entryPrice = priceProvider.getPrice(data.instrumentId);

    // 7. Atomic transaction: debit balance + create trade + ledger entry
    const expiresAt = new Date(Date.now() + data.expirationSeconds * 1000);

    const { trade, account: updatedAccount } = await tradeRepository.openTrade({
      userId: data.userId,
      accountId: data.accountId,
      instrumentId: data.instrumentId,
      direction: data.direction,
      amount: data.amount,
      entryPrice,
      payoutPercent: instrument.payoutPercent,
      expiresAt,
      idempotencyKey: data.idempotencyKey,
    });

    // 8. Store idempotency key in Redis
    if (data.idempotencyKey) {
      await redis.set(
        `${IDEMPOTENCY_KEY_PREFIX}${data.idempotencyKey}`,
        trade.id,
        "EX",
        IDEMPOTENCY_KEY_TTL,
      );
    }

    // 9. Track active trade in Redis
    try {
      await redis.sadd(`${ACTIVE_TRADES_PREFIX}${data.userId}`, trade.id);
    } catch (err) {
      logger.error({ err, tradeId: trade.id, userId: data.userId }, "Failed to add trade to active set — Redis may be desynchronized");
    }

    // 10. Schedule BullMQ closing job
    const delayMs = expiresAt.getTime() - Date.now();
    await getTradeClosingQueue().add(
      "close-trade",
      { tradeId: trade.id },
      {
        jobId: `close-${trade.id}`,
        delay: Math.max(delayMs, 0),
        attempts: TRADE_CLOSING_MAX_RETRIES,
        backoff: { type: "exponential", delay: TRADE_CLOSING_BACKOFF_MS },
        removeOnComplete: true,
      },
    );

    logger.info(
      { tradeId: trade.id, userId: data.userId, instrument: data.instrumentId, amount: data.amount },
      "Trade opened",
    );

    // 11. WS events
    const tradeDTO = toTradeDTO(trade);
    sendTradeOpen(data.userId, tradeDTO);
    sendAccountSnapshot(data.userId, toAccountDTO(updatedAccount));

    return tradeDTO;
  },

  async listTrades(
    userId: string,
    limit: number,
    offset: number,
    status?: "OPEN" | "WIN" | "LOSS" | "TIE" | "CLOSED",
    accountType?: "DEMO" | "REAL",
  ): Promise<{ trades: TradeDTO[]; hasMore: boolean; total: number }> {
    const [trades, total] = await Promise.all([
      tradeRepository.findByUserIdPaginated(userId, limit, offset, status, accountType),
      tradeRepository.countByUserId(userId, status, accountType),
    ]);

    return {
      trades: trades.map(toTradeDTO),
      hasMore: offset + trades.length < total,
      total,
    };
  },

  async getStatistics(userId: string) {
    const rows = await tradeRepository.getClosedTradesStats(userId);

    let winCount = 0;
    let lossCount = 0;
    let tieCount = 0;
    let totalVolume = 0;
    let netProfit = 0;

    for (const r of rows) {
      totalVolume += r._sumAmount;

      if (r.status === "WIN") {
        winCount = r._count;
        netProfit += r._sumPayout;
      } else if (r.status === "LOSS") {
        lossCount = r._count;
        netProfit -= r._sumAmount;
      } else if (r.status === "TIE") {
        tieCount = r._count;
      }
    }

    const totalTrades = winCount + lossCount + tieCount;
    const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 10000) / 100 : 0;

    return { totalTrades, winRate, totalVolume, netProfit, winCount, lossCount, tieCount };
  },

  async getBalanceHistory(
    userId: string,
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ history: { date: string; balance: string }[] }> {
    const account = await accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw AppError.forbidden("Account does not belong to this user");
    }

    const history = await ledgerRepository.getBalanceHistory(accountId, startDate, endDate);
    return { history };
  },

  async getAnalytics(userId: string, startDate: Date, endDate: Date) {
    const trades = await tradeRepository.getClosedTradesByUserIdWithDetails(
      userId,
      startDate,
      endDate,
    );

    const byInstrument = new Map<string, { wins: number; losses: number; ties: number; volume: number }>();
    const byDirection = { CALL: { wins: 0, losses: 0, total: 0 }, PUT: { wins: 0, losses: 0, total: 0 } };

    for (const t of trades) {
      const amount = Number(t.amount);

      // By instrument
      let inst = byInstrument.get(t.instrumentId);
      if (!inst) {
        inst = { wins: 0, losses: 0, ties: 0, volume: 0 };
        byInstrument.set(t.instrumentId, inst);
      }
      inst.volume += amount;
      if (t.status === "WIN") inst.wins++;
      else if (t.status === "LOSS") inst.losses++;
      else if (t.status === "TIE") inst.ties++;

      // By direction
      const dir = byDirection[t.direction];
      dir.total++;
      if (t.status === "WIN") dir.wins++;
      else if (t.status === "LOSS") dir.losses++;
    }

    return {
      byInstrument: Array.from(byInstrument.entries()).map(([id, stats]) => ({
        instrumentId: id,
        ...stats,
      })),
      byDirection,
    };
  },
};
