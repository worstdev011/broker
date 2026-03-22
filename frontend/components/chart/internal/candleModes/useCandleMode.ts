/**
 * useCandleMode - оркестрация режимов отображения свечей
 * 
 * FLOW G10: Candle modes orchestration
 * 
 * Ответственность:
 * - Управление режимом отображения
 * - Трансформация свечей для рендера
 * - Предоставление API для переключения режимов
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - менять useChartData
 * - сохранять HA свечи
 * - мутировать source candles
 * - менять history / ws
 * - useState
 */

import { useRef } from 'react';
import type { Candle } from '../chart.types';
import type { CandleMode } from './candleMode.types';
import { transformToHeikinAshi, transformLiveCandleToHeikinAshi } from './heikinAshi';
import { transformToBars } from './barTransform';

interface UseCandleModeParams {
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  /** Начальный режим при монтировании (восстанавливается из localStorage) */
  initialMode?: CandleMode;
}

interface UseCandleModeReturn {
  getRenderCandles: () => Candle[];
  getRenderLiveCandle: () => Candle | null;
  /** Live свеча для рендера с учётом аниматора: если передан animatedCandle, применяем transform к нему */
  getLiveCandleForRender: (animatedCandle: Candle | null) => Candle | null;
  setMode: (mode: CandleMode) => void;
  getMode: () => CandleMode;
}

export function useCandleMode({
  getCandles,
  getLiveCandle,
  initialMode = 'classic',
}: UseCandleModeParams): UseCandleModeReturn {
  // Хранение режима через useRef (не useState!)
  const modeRef = useRef<CandleMode>(initialMode);

  /**
   * Получить текущий режим
   */
  const getMode = (): CandleMode => {
    return modeRef.current;
  };

  /**
   * Установить режим
   */
  const setMode = (mode: CandleMode): void => {
    modeRef.current = mode;
  };

  /**
   * Получить свечи для рендера (с учётом режима)
   */
  const getRenderCandles = (): Candle[] => {
    const candles = getCandles();
    const mode = modeRef.current;

    switch (mode) {
      case 'classic':
        // Возвращаем как есть
        return candles;

      case 'heikin_ashi':
        // Трансформируем в Heikin Ashi
        return transformToHeikinAshi(candles);

      case 'bars':
        // Для bars данные не меняются, только способ отрисовки
        return transformToBars(candles);

      default:
        return candles;
    }
  };

  /**
   * Получить live-свечу для рендера (с учётом режима)
   */
  const getRenderLiveCandle = (): Candle | null => {
    const liveCandle = getLiveCandle();
    if (!liveCandle) {
      return null;
    }

    const mode = modeRef.current;

    switch (mode) {
      case 'classic':
        // Возвращаем как есть
        return liveCandle;

      case 'heikin_ashi': {
        // Трансформируем live-свечу в Heikin Ashi
        // Нужна последняя трансформированная закрытая свеча для вычисления HA_open
        const candles = getCandles();
        
        if (candles.length === 0) {
          // Если нет закрытых свечей, используем формулу для первой свечи
          return transformLiveCandleToHeikinAshi(liveCandle, null);
        }
        
        // Трансформируем все закрытые свечи в HA
        const haCandles = transformToHeikinAshi(candles);
        // Берём последнюю трансформированную свечу
        const prevHaCandle = haCandles[haCandles.length - 1];

        return transformLiveCandleToHeikinAshi(liveCandle, prevHaCandle);
      }

      case 'bars':
        // Для bars данные не меняются, только способ отрисовки
        return liveCandle;

      default:
        return liveCandle;
    }
  };

  /**
   * Live свеча для рендера с учётом аниматора.
   * Если передан animatedCandle - применяем transform к нему (иначе анимированная live рисуется как classic).
   */
  const getLiveCandleForRender = (animatedCandle: Candle | null): Candle | null => {
    const mode = modeRef.current;
    const source = animatedCandle ?? getRenderLiveCandle();
    if (!source) return null;

    // animatedCandle уже прошёл через getRenderLiveCandle при null - но когда animatedCandle есть,
    // getRenderLiveCandle не вызывался. Значит source = raw animated. Нужно применить transform.
    if (!animatedCandle) return source; // getRenderLiveCandle уже применил transform

    switch (mode) {
      case 'classic':
      case 'bars':
        return animatedCandle;
      case 'heikin_ashi': {
        const candles = getCandles();
        const haCandles = transformToHeikinAshi(candles);
        const prevHaCandle = haCandles.length > 0 ? haCandles[haCandles.length - 1] : null;
        return transformLiveCandleToHeikinAshi(animatedCandle, prevHaCandle);
      }
      default:
        return animatedCandle;
    }
  };

  return {
    getRenderCandles,
    getRenderLiveCandle,
    getLiveCandleForRender,
    setMode,
    getMode,
  };
}
