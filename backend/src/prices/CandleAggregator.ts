import { EventEmitter } from "node:events";
import type { PriceTick } from "./engines/OtcPriceEngine.js";
import type { PriceEngineManager } from "./PriceEngineManager.js";
import { prisma } from "../infrastructure/prisma/client.js";
import { logger } from "../shared/logger.js";

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
}

export interface CandleCloseEvent {
  instrumentId: string;
  timeframe: string;
  candle: CandleData;
}

const TIMEFRAMES: Record<string, number> = {
  "5s": 5_000,
  "10s": 10_000,
  "15s": 15_000,
  "30s": 30_000,
  "1m": 60_000,
  "2m": 120_000,
  "3m": 180_000,
  "5m": 300_000,
  "10m": 600_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

const MAX_MEMORY_CANDLES = 500;

function parseTimeframeMs(tf: string): number {
  const m = tf.match(/^(\d+)([smhd])$/);
  if (!m) return 5_000;
  const multipliers: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(m[1], 10) * (multipliers[m[2]] ?? 1_000);
}

function candleBucket(timestamp: number, periodMs: number): number {
  return Math.floor(timestamp / periodMs) * periodMs;
}

/**
 * Aggregates raw price ticks into OHLC candles for every supported timeframe.
 * Keeps the last 500 closed candles per instrument+timeframe in memory.
 * Emits 'candle:close' when a candle finalises.
 */
export class CandleAggregator extends EventEmitter {
  private active = new Map<string, CandleData>();
  private history = new Map<string, CandleData[]>();

  constructor(manager: PriceEngineManager) {
    super();
    manager.on("price:tick", (tick: PriceTick) => this.onTick(tick));
  }

  getActiveCandle(instrumentId: string, timeframe: string): CandleData | undefined {
    return this.active.get(this.key(instrumentId, timeframe));
  }

  getCandlesFromMemory(instrumentId: string, timeframe: string, limit: number): CandleData[] {
    const list = this.history.get(this.key(instrumentId, timeframe)) ?? [];
    return list.slice(-limit);
  }

  async getCandlesFromDb(
    instrumentId: string,
    timeframe: string,
    limit: number,
    to?: number,
  ): Promise<CandleData[]> {
    const where: Record<string, unknown> = { symbol: instrumentId, timeframe };
    if (to !== undefined) {
      where.timestamp = { lt: BigInt(to) };
    }

    const rows = await prisma.candle.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return rows
      .map((r) => ({
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        startTime: Number(r.timestamp),
        endTime: Number(r.timestamp) + (TIMEFRAMES[timeframe] ?? parseTimeframeMs(timeframe)),
      }))
      .reverse();
  }

  private onTick(tick: PriceTick): void {
    for (const [tf, periodMs] of Object.entries(TIMEFRAMES)) {
      const k = this.key(tick.instrumentId, tf);
      const bucket = candleBucket(tick.timestamp, periodMs);
      const current = this.active.get(k);

      if (!current || current.startTime !== bucket) {
        if (current) {
          this.closeCandle(tick.instrumentId, tf, current);
        }
        this.active.set(k, {
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          startTime: bucket,
          endTime: bucket + periodMs,
        });
      } else {
        current.high = Math.max(current.high, tick.price);
        current.low = Math.min(current.low, tick.price);
        current.close = tick.price;
      }
    }
  }

  private closeCandle(instrumentId: string, timeframe: string, candle: CandleData): void {
    const k = this.key(instrumentId, timeframe);
    let list = this.history.get(k);
    if (!list) {
      list = [];
      this.history.set(k, list);
    }
    list.push(candle);
    if (list.length > MAX_MEMORY_CANDLES) {
      list.splice(0, list.length - MAX_MEMORY_CANDLES);
    }

    this.emit("candle:close", {
      instrumentId,
      timeframe,
      candle,
    } satisfies CandleCloseEvent);

    this.persistCandle(instrumentId, timeframe, candle);
  }

  private async persistCandle(
    instrumentId: string,
    timeframe: string,
    candle: CandleData,
  ): Promise<void> {
    try {
      await prisma.candle.upsert({
        where: {
          symbol_timeframe_timestamp: {
            symbol: instrumentId,
            timeframe,
            timestamp: BigInt(candle.startTime),
          },
        },
        update: {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        },
        create: {
          symbol: instrumentId,
          timeframe,
          timestamp: BigInt(candle.startTime),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        },
      });
    } catch (error) {
      logger.warn(
        { err: error, instrumentId, timeframe },
        "Failed to persist candle",
      );
    }
  }

  private key(instrumentId: string, timeframe: string): string {
    return `${instrumentId}:${timeframe}`;
  }
}
