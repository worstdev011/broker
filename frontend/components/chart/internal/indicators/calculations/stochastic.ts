/**
 * stochastic.ts - Stochastic Oscillator (%K, %D)
 *
 * FLOW G12: Stochastic calculation
 *
 * Slow Stochastic (менее чувствительный, плавнее идёт):
 * Raw %K = 100 * (Close - Low_n) / (High_n - Low_n)
 * %K = SMA(Raw %K, smoothK)  - сглаживание, по умолчанию 3
 * %D = SMA(%K, periodD)
 *
 * Оба в диапазоне 0-100. Уровни перекупленности/перепроданности: 80 и 20.
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

export type StochasticResult = {
  k: IndicatorPoint[];
  d: IndicatorPoint[];
};

/** SMA по массиву значений для окна size, начиная с индекса size-1 */
function sma(values: number[], size: number): number[] {
  const out: number[] = [];
  for (let i = size - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - size + 1; j <= i; j++) sum += values[j];
    out.push(sum / size);
  }
  return out;
}

/**
 * Вычисляет Stochastic Oscillator (Slow: сглаженный %K и %D, меньше бьётся от границы к границе)
 *
 * @param candles - массив закрытых свечей
 * @param periodK - период для сырого %K (обычно 14)
 * @param periodD - период сглаживания для %D (обычно 3)
 * @param smoothK - сглаживание сырого %K (3 = Slow Stochastic, 1 = Fast)
 * @returns { k, d } - массивы точек для %K и %D
 */
export function calculateStochastic(
  candles: Candle[],
  periodK: number,
  periodD: number = 3,
  smoothK: number = 3
): StochasticResult {
  if (candles.length < periodK) {
    return { k: [], d: [] };
  }

  const rawK: number[] = [];
  const times: number[] = [];

  for (let i = periodK - 1; i < candles.length; i++) {
    let high = candles[i].high;
    let low = candles[i].low;
    for (let j = i - periodK + 1; j < i; j++) {
      if (candles[j].high > high) high = candles[j].high;
      if (candles[j].low < low) low = candles[j].low;
    }
    const close = candles[i].close;
    const range = high - low;
    const value = range === 0 ? 50 : (100 * (close - low)) / range;
    rawK.push(value);
    times.push(candles[i].endTime);
  }

  const kValues = smoothK > 1 ? sma(rawK, smoothK) : rawK;
  const kStart = smoothK > 1 ? smoothK - 1 : 0;
  const kPoints: IndicatorPoint[] = kValues.map((value, idx) => ({
    time: times[kStart + idx],
    value,
  }));

  if (kPoints.length < periodD) {
    return { k: kPoints, d: [] };
  }

  const dValues = sma(kPoints.map((p) => p.value), periodD);
  const dStart = periodD - 1;
  const dPoints: IndicatorPoint[] = dValues.map((value, idx) => ({
    time: kPoints[dStart + idx].time,
    value,
  }));

  return { k: kPoints, d: dPoints };
}
