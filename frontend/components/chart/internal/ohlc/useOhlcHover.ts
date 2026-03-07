/**
 * useOhlcHover - ядро FLOW G8
 * 
 * Ответственность:
 * - Определение свечи под курсором
 * - Извлечение OHLC данных
 * - Управление состоянием OHLC панели
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - useState
 * - мутировать data
 * - менять viewport
 * - менять crosshair
 * - websocket
 * - forEach по всем свечам
 */

import { useRef, useEffect } from 'react';
import type { CrosshairState } from '../crosshair/crosshair.types';
import type { Candle } from '../chart.types';
import type { OhlcData } from './ohlc.types';

interface UseOhlcHoverParams {
  getCrosshair: () => CrosshairState | null;
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  timeframeMs: number;
}

interface UseOhlcHoverReturn {
  getOhlc: () => OhlcData | null;
  updateOhlc: () => void; // Для вызова из render loop
}

/**
 * Бинарный поиск свечи по времени
 * Возвращает индекс свечи или -1 если не найдена
 */
function binarySearchCandle(
  candles: Candle[],
  time: number
): number {
  if (candles.length === 0) return -1;

  let left = 0;
  let right = candles.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const candle = candles[mid];

    // Проверяем, попадает ли время в диапазон свечи
    if (time >= candle.startTime && time < candle.endTime) {
      return mid;
    }

    // Если время до начала свечи - ищем слева
    if (time < candle.startTime) {
      right = mid - 1;
    } else {
      // Если время после конца свечи - ищем справа
      left = mid + 1;
    }
  }

  return -1;
}

export function useOhlcHover({
  getCrosshair,
  getCandles,
  getLiveCandle,
  timeframeMs,
}: UseOhlcHoverParams): UseOhlcHoverReturn {
  // Хранение состояния через useRef (не useState!)
  const ohlcRef = useRef<OhlcData | null>(null);

  /**
   * Получить текущие OHLC данные
   */
  const getOhlc = (): OhlcData | null => {
    return ohlcRef.current;
  };

  /**
   * Обновление OHLC данных на основе crosshair
   * Вызывается из render loop для синхронизации с кадрами
   */
  const updateOhlc = () => {
    const crosshair = getCrosshair();

    // 1️⃣ Если crosshair не активен → вернуть null
    if (!crosshair || !crosshair.isActive) {
      ohlcRef.current = null;
      return;
    }

    const time = crosshair.time;
    const liveCandle = getLiveCandle();
    const candles = getCandles();

    // 2️⃣ Проверяем live-свечу по периоду (crosshair снэпится к центру свечи = startTime + timeframeMs/2, а endTime в данных = текущее время, поэтому time < endTime часто ложно)
    if (liveCandle) {
      const livePeriodEnd = liveCandle.startTime + timeframeMs;
      if (time >= liveCandle.startTime && time < livePeriodEnd) {
        ohlcRef.current = {
          open: liveCandle.open,
          high: liveCandle.high,
          low: liveCandle.low,
          close: liveCandle.close,
          time: liveCandle.startTime,
          isLive: true,
        };
        return;
      }
    }

    // 3️⃣ Ищем среди закрытых свечей (бинарный поиск)
    const candleIndex = binarySearchCandle(candles, time);

    if (candleIndex !== -1) {
      const candle = candles[candleIndex];
      ohlcRef.current = {
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        time: candle.startTime,
        isLive: false,
      };
    } else {
      // Свеча не найдена
      ohlcRef.current = null;
    }
  };

  return {
    getOhlc,
    updateOhlc,
  };
}
