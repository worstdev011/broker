/**
 * awesomeOscillator.ts - Awesome Oscillator (Bill Williams)
 *
 * FLOW G12: AO calculation
 *
 * AO = SMA(Median Price, 5) - SMA(Median Price, 34)
 * Median Price = (High + Low) / 2
 * Гистограмма: положительные значения - зелёные столбцы вверх, отрицательные - красные вниз.
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

/**
 * SMA по массиву чисел для окна size
 */
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
 * Вычисляет Awesome Oscillator.
 *
 * @param candles - массив закрытых свечей
 * @param slowPeriod - медленный период (обычно 34)
 * @param fastPeriod - быстрый период (обычно 5)
 * @returns массив точек { time, value }, value может быть положительным и отрицательным
 */
export function calculateAwesomeOscillator(
  candles: Candle[],
  slowPeriod: number = 34,
  fastPeriod: number = 5
): IndicatorPoint[] {
  if (candles.length < slowPeriod || fastPeriod >= slowPeriod) {
    return [];
  }

  const medianPrices = candles.map((c) => (c.high + c.low) / 2);
  const smaFast = sma(medianPrices, fastPeriod);
  const smaSlow = sma(medianPrices, slowPeriod);

  const points: IndicatorPoint[] = [];
  for (let i = 0; i < smaSlow.length; i++) {
    const candleIdx = slowPeriod - 1 + i;
    const fastIdx = slowPeriod - fastPeriod + i;
    const ao = smaFast[fastIdx] - smaSlow[i];
    points.push({
      time: candles[candleIdx].endTime,
      value: ao,
    });
  }

  return points;
}
