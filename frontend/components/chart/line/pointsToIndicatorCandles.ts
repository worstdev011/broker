import type { Candle } from '../internal/chart.types';

const BUCKET_MS = 1000;

/**
 * Агрегирует тики линейного графика в 1s-свечи для расчёта индикаторов (как на свечном).
 */
export function pointsToIndicatorCandles(
  points: ReadonlyArray<{ time: number; price: number }>,
  nowMs: number,
): Candle[] {
  if (points.length === 0) return [];

  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number }
  >();

  for (const p of points) {
    if (!Number.isFinite(p.time) || !Number.isFinite(p.price) || p.price <= 0) continue;
    const start = Math.floor(p.time / BUCKET_MS) * BUCKET_MS;
    const b = buckets.get(start);
    if (!b) {
      buckets.set(start, {
        open: p.price,
        high: p.price,
        low: p.price,
        close: p.price,
      });
    } else {
      b.high = Math.max(b.high, p.price);
      b.low = Math.min(b.low, p.price);
      b.close = p.price;
    }
  }

  const starts = Array.from(buckets.keys()).sort((a, b) => a - b);
  const candles: Candle[] = [];
  for (const start of starts) {
    const b = buckets.get(start)!;
    const end = start + BUCKET_MS;
    candles.push({
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      startTime: start,
      endTime: end,
      isClosed: nowMs >= end,
    });
  }
  return candles;
}
