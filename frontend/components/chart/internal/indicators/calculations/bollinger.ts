/**
 * bollinger.ts - Bollinger Bands
 *
 * Middle = SMA(close, period)
 * StdDev = standard deviation of close over period
 * Upper = Middle + stdDevMult * StdDev
 * Lower = Middle - stdDevMult * StdDev
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }
    result.push(sum / period);
  }
  return result;
}

function stdDev(values: number[], mean: number, start: number, period: number): number {
  let sumSq = 0;
  for (let j = start - period + 1; j <= start; j++) {
    const d = values[j] - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / period);
}

/**
 * Bollinger Bands: upper, middle, lower
 *
 * @param candles - массив закрытых свечей
 * @param period - период (обычно 20)
 * @param stdDevMult - множитель стандартного отклонения (обычно 2)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number,
  stdDevMult: number = 2
): { upper: IndicatorPoint[]; middle: IndicatorPoint[]; lower: IndicatorPoint[] } {
  if (candles.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const closes = candles.map((c) => c.close);
  const middleValues = sma(closes, period);
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let i = 0; i < middleValues.length; i++) {
    const candleIndex = i + period - 1;
    const candle = candles[candleIndex];
    const mid = middleValues[i];
    const dev = stdDev(closes, mid, candleIndex, period);
    const up = mid + stdDevMult * dev;
    const lo = mid - stdDevMult * dev;

    middle.push({ time: candle.endTime, value: mid });
    upper.push({ time: candle.endTime, value: up });
    lower.push({ time: candle.endTime, value: lo });
  }

  return { upper, middle, lower };
}
