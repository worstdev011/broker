/**
 * Candle store - per instrument (instrumentId):
 * - active candle in Redis (candle:active:${instrumentId})
 * - closed candles in PostgreSQL (symbol column stores instrumentId)
 */

import { getRedisClient } from '../../bootstrap/redis.js';
import { getPrismaClient } from '../../bootstrap/database.js';
import type { Candle, Timeframe } from '../PriceTypes.js';
import { logger } from '../../shared/logger.js';

function activeKey(instrumentId: string): string {
  return `candle:active:${instrumentId}`;
}

export class CandleStore {
  /** TTL for active candle keys - auto-expire stale data after server crashes. */
  private static readonly ACTIVE_CANDLE_TTL_SECONDS = 120;

  private static readonly CACHE_LIMIT = 120;
  private recentCandlesCache = new Map<string, Candle[]>();

  private cacheKey(instrumentId: string, timeframe: string): string {
    return `${instrumentId}:${timeframe}`;
  }

  /** Push a candle into the in-memory cache (ring buffer). */
  private pushToCache(instrumentId: string, candle: Candle): void {
    const key = this.cacheKey(instrumentId, candle.timeframe);
    let arr = this.recentCandlesCache.get(key);
    if (!arr) {
      arr = [];
      this.recentCandlesCache.set(key, arr);
    }
    arr.push(candle);
    if (arr.length > CandleStore.CACHE_LIMIT) {
      arr.splice(0, arr.length - CandleStore.CACHE_LIMIT);
    }
  }

  async setActiveCandle(instrumentId: string, candle: Candle): Promise<void> {
    const redis = getRedisClient();
    const data = JSON.stringify(candle);
    await redis.set(activeKey(instrumentId), data, 'EX', CandleStore.ACTIVE_CANDLE_TTL_SECONDS);
  }

  async getActiveCandle(instrumentId: string): Promise<Candle | null> {
    const redis = getRedisClient();
    const data = await redis.get(activeKey(instrumentId));

    if (!data) return null;

    try {
      if (typeof data === 'string') {
        return JSON.parse(data) as Candle;
      }
      if (typeof data === 'object') {
        return data as Candle;
      }
      return null;
    } catch (error) {
      logger.error({ err: error }, 'Failed to parse active candle from store');
      return null;
    }
  }

  private static readonly WRITE_RETRY_ATTEMPTS = 3;
  private static readonly WRITE_RETRY_DELAY_MS = 500;

  async addClosedCandle(instrumentId: string, candle: Candle): Promise<void> {
    this.pushToCache(instrumentId, candle);

    const prisma = getPrismaClient();
    const ts = typeof candle.timestamp === 'number' ? candle.timestamp : new Date(candle.timestamp).getTime();

    for (let attempt = 1; attempt <= CandleStore.WRITE_RETRY_ATTEMPTS; attempt++) {
      try {
        await prisma.candle.upsert({
          where: {
            symbol_timeframe_timestamp: {
              symbol: instrumentId,
              timeframe: candle.timeframe,
              timestamp: BigInt(ts),
            },
          },
          create: {
            symbol: instrumentId,
            timeframe: candle.timeframe,
            timestamp: BigInt(ts),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          },
          update: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          },
        });
        return;
      } catch (e: unknown) {
        if (attempt < CandleStore.WRITE_RETRY_ATTEMPTS) {
          logger.warn({ err: e, attempt, instrumentId, ts }, 'Retrying closed candle DB write');
          await new Promise((r) => setTimeout(r, CandleStore.WRITE_RETRY_DELAY_MS * attempt));
        } else {
          logger.error({ err: e, instrumentId, ts }, 'Failed to save closed candle after retries');
        }
      }
    }
  }

  async getClosedCandles(instrumentId: string, timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    const key = this.cacheKey(instrumentId, timeframe);
    const cached = this.recentCandlesCache.get(key);
    if (cached && cached.length >= limit) {
      return cached.slice(-limit);
    }

    const prisma = getPrismaClient();

    const rows = await prisma.candle.findMany({
      where: { symbol: instrumentId, timeframe },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const result = rows
      .slice()
      .reverse()
      .map((r) => ({
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        timestamp: Number(r.timestamp),
        timeframe: r.timeframe as string,
      }));

    if (result.length >= limit) {
      this.recentCandlesCache.set(key, result.slice());
    }

    return result;
  }

  async getClosedCandlesBefore(
    instrumentId: string,
    timeframe: Timeframe,
    toTime: number,
    limit: number = 200,
  ): Promise<Candle[]> {
    const prisma = getPrismaClient();

    const rows = await prisma.candle.findMany({
      where: {
        symbol: instrumentId,
        timeframe,
        timestamp: { lt: BigInt(toTime) },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return rows
      .slice()
      .reverse()
      .map((r) => ({
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        timestamp: Number(r.timestamp),
        timeframe: r.timeframe,
      }));
  }

  async clear(instrumentId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(activeKey(instrumentId));
  }
}
