/**
 * heikinAshi.ts - трансформация свечей в Heikin Ashi
 * 
 * FLOW G10: Heikin Ashi transformation
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - мутировать исходные свечи
 * - сохранять результат
 */

import type { Candle } from '../chart.types';

/**
 * Трансформирует массив свечей в Heikin Ashi
 * 
 * Формулы:
 * HA_close = (O + H + L + C) / 4
 * HA_open = (prev_HA_open + prev_HA_close) / 2
 * HA_high = max(H, HA_open, HA_close)
 * HA_low  = min(L, HA_open, HA_close)
 * 
 * Первая свеча:
 * HA_open = (O + C) / 2
 */
export function transformToHeikinAshi(candles: Candle[]): Candle[] {
  if (candles.length === 0) {
    return [];
  }

  const haCandles: Candle[] = [];
  let prevHaOpen: number | null = null;
  let prevHaClose: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    if (!Number.isFinite(candle.open) || !Number.isFinite(candle.high) ||
        !Number.isFinite(candle.low)  || !Number.isFinite(candle.close)) {
      haCandles.push({ ...candle });
      continue;
    }
    
    const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;

    // HA_open
    let haOpen: number;
    if (i === 0) {
      // Первая свеча: HA_open = (O + C) / 2
      haOpen = (candle.open + candle.close) / 2;
    } else {
      // Остальные: HA_open = (prev_HA_open + prev_HA_close) / 2
      haOpen = ((prevHaOpen ?? 0) + (prevHaClose ?? 0)) / 2;
    }

    // HA_high = max(H, HA_open, HA_close)
    const haHigh = Math.max(candle.high, haOpen, haClose);

    // HA_low = min(L, HA_open, HA_close)
    const haLow = Math.min(candle.low, haOpen, haClose);

    // Создаём новую свечу (не мутируем исходную!)
    haCandles.push({
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      startTime: candle.startTime,
      endTime: candle.endTime,
      isClosed: candle.isClosed,
    });

    // Сохраняем для следующей итерации
    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }

  return haCandles;
}

/**
 * Трансформирует live-свечу в Heikin Ashi
 * Требует предыдущую HA свечу для вычисления HA_open
 */
export function transformLiveCandleToHeikinAshi(
  liveCandle: Candle,
  prevHaCandle: Candle | null
): Candle {
  // HA_close = (O + H + L + C) / 4
  const haClose = (liveCandle.open + liveCandle.high + liveCandle.low + liveCandle.close) / 4;

  // HA_open
  let haOpen: number;
  if (!prevHaCandle) {
    // Если нет предыдущей HA свечи → используем формулу для первой свечи
    haOpen = (liveCandle.open + liveCandle.close) / 2;
  } else {
    // HA_open = (prev_HA_open + prev_HA_close) / 2
    haOpen = (prevHaCandle.open + prevHaCandle.close) / 2;
  }

  // HA_high = max(H, HA_open, HA_close)
  const haHigh = Math.max(liveCandle.high, haOpen, haClose);

  // HA_low = min(L, HA_open, HA_close)
  const haLow = Math.min(liveCandle.low, haOpen, haClose);

  return {
    open: haOpen,
    high: haHigh,
    low: haLow,
    close: haClose,
    startTime: liveCandle.startTime,
    endTime: liveCandle.endTime,
    isClosed: liveCandle.isClosed,
  };
}
