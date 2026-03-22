/**
 * keltner.ts - Keltner Channels
 *
 * FLOW G12: Keltner Channels calculation
 *
 * Middle = EMA(close, period)
 * ATR = EMA(True Range, period), True Range = max(H-L, |H-prevClose|, |L-prevClose|)
 * Upper = Middle + atrMult * ATR
 * Lower = Middle - atrMult * ATR
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';
import { calculateEMA } from './ema';

function emaOfSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  result.push(ema);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result.push(ema);
  }
  return result;
}

/**
 * True Range для каждой свечи (первая - просто H-L).
 */
function trueRanges(candles: Candle[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      tr.push(c.high - c.low);
    } else {
      const prevClose = candles[i - 1].close;
      const hl = c.high - c.low;
      const hc = Math.abs(c.high - prevClose);
      const lc = Math.abs(c.low - prevClose);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  return tr;
}

/**
 * Каналы Кельтнера: upper, middle, lower.
 *
 * @param candles - массив закрытых свечей
 * @param period - период EMA и ATR (обычно 20)
 * @param atrMult - множитель ATR для ширины канала (обычно 2)
 */
export function calculateKeltnerChannels(
  candles: Candle[],
  period: number,
  atrMult: number = 2
): { upper: IndicatorPoint[]; middle: IndicatorPoint[]; lower: IndicatorPoint[] } {
  if (candles.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const middlePoints = calculateEMA(candles, period);
  const tr = trueRanges(candles);
  const atrValues = emaOfSeries(tr, period);

  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let i = 0; i < middlePoints.length; i++) {
    const mid = middlePoints[i].value;
    const atr = atrValues[i];
    const t = middlePoints[i].time;
    middle.push({ time: t, value: mid });
    upper.push({ time: t, value: mid + atrMult * atr });
    lower.push({ time: t, value: mid - atrMult * atr });
  }

  return { upper, middle, lower };
}
