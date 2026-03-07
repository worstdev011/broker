/**
 * useViewport - ядро FLOW G3
 * 
 * Ответственность:
 * - Хранение viewport
 * - Инициализация на основе данных
 * - Auto-fit по Y (обязательно)
 * - Пересчет при изменении данных
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - follow mode
 * - pan / zoom
 * - canvas
 * - render
 * - websocket
 * - useState
 * - side-effects вне хука
 */

import { useRef, useEffect } from 'react';
import type React from 'react';
import type { Viewport, ViewportConfig } from './viewport.types';
import type { Candle } from './chart.types';
import { panViewportTime, clampToDataBounds } from './interactions/math';

interface UseViewportParams {
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  timeframeMs: number;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  config?: Partial<ViewportConfig>;
  // 🔥 FLOW C-INERTIA: Pan inertia refs (опционально, для совместимости)
  panInertiaRefs?: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  };
  // 🔥 FLOW C-INERTIA: Callback для изменения viewport (для загрузки истории)
  onViewportChangeRef?: React.MutableRefObject<((viewport: Viewport) => void) | null>;
  // FLOW C-MARKET-CLOSED: останавливать инерцию когда рынок закрыт
  getMarketStatus?: () => 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';
}

// 🔥 FLOW: Timeframe-aware visibleCandles - UX константы
const TARGET_CANDLE_PX = 14; // Визуально комфортная ширина свечи в пикселях
const MIN_VISIBLE_CANDLES = 35; // Минимум свечей (ограничение max zoom in)
const MAX_VISIBLE_CANDLES = 300; // Максимум свечей на экране
const BASE_TIMEFRAME_MS = 5000; // Базовый таймфрейм (5s) в миллисекундах

const FOLLOW_SHIFT_DURATION_MS = 200;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

interface UseViewportReturn {
  viewportRef: React.RefObject<Viewport | null>;
  getViewport: () => Viewport | null;
  recalculateViewport: () => void;
  recalculateYOnly: () => void; // Только Y, без изменения X
  updateViewport: (newViewport: Viewport) => void;
  config: ViewportConfig;
  // 🔥 FLOW F1 / F3–F5 / F8: Follow mode API
  setFollowMode: (on: boolean) => void;
  getFollowMode: () => boolean;
  toggleFollowMode: () => void;
  /** FLOW F3: обновить якорь текущего времени рынка (price:update / candle:close) */
  setLatestCandleTime: (ts: number) => void;
  /** FLOW F4: мгновенно поставить viewport на актуальные свечи */
  followLatest: () => void;
  /** FLOW F8: показывать кнопку «Вернуться к текущим» */
  shouldShowReturnToLatest: () => boolean;
  /** Плавный сдвиг viewport к цели в follow mode. Вызывать каждый кадр из render loop. */
  advanceFollowAnimation: (now: number) => void;
  // 🔥 FLOW Y1: Y-scale drag API
  beginYScaleDrag: (startY: number) => void;
  updateYScaleDrag: (currentY: number) => void;
  endYScaleDrag: () => void;
  resetYScale: () => void;
  // 🔥 FLOW: Timeframe Switch Reset - полный сброс viewport
  reset: () => void;
  // 🔥 FLOW C-INERTIA: Pan inertia API
  advancePanInertia: (now: number) => void;
  // 🔥 FLOW Y-SMOOTH: Плавная анимация Y-оси
  advanceYAnimation: (now: number) => void;
  // 🔥 FLOW RETURN-TO-FOLLOW: Auto return API
  scheduleReturnToFollow: () => void;
  cancelReturnToFollow: () => void;
}

const DEFAULT_CONFIG: ViewportConfig = {
  visibleCandles: 60, // Дефолт, будет пересчитан на основе canvasWidth
  yPaddingRatio: 0.1,
  rightPaddingRatio: 0.35, // 35% для follow mode
};

/**
 * Вычисляет visibleCandles на основе ширины canvas, целевого размера свечи и таймфрейма
 * 🔥 FLOW: Timeframe-aware initial zoom - учитываем коэффициент таймфрейма
 * 
 * Формула: 
 *   baseVisible = canvasWidth / TARGET_CANDLE_PX
 *   timeframeMultiplier = timeframeMs / BASE_TIMEFRAME_MS
 *   visibleCandles = baseVisible * timeframeMultiplier
 * 
 * Это гарантирует одинаковую визуальную ширину свечей на всех ТФ:
 * - 5s: multiplier = 1 → видим базовое количество
 * - 30s: multiplier = 6 → видим в 6 раз больше (отодвигаемся назад)
 * - 1m: multiplier = 12 → видим в 12 раз больше (еще дальше)
 */
function calculateVisibleCandles(canvasWidth: number | null, timeframeMs: number): number {
  if (!canvasWidth || canvasWidth <= 0) {
    // Если canvas еще не готов, используем дефолтное значение
    return DEFAULT_CONFIG.visibleCandles;
  }
  
  // Базовое количество свечей для базового таймфрейма (5s)
  const baseVisible = canvasWidth / TARGET_CANDLE_PX;
  
  // Коэффициент таймфрейма: во сколько раз текущий ТФ больше базового
  const timeframeMultiplier = timeframeMs / BASE_TIMEFRAME_MS;
  
  // Умножаем на коэффициент: большие ТФ автоматически "отодвигаются назад"
  const rawVisible = baseVisible * timeframeMultiplier;
  
  // Ограничиваем минимальным и максимальным количеством
  return Math.max(
    MIN_VISIBLE_CANDLES,
    Math.min(MAX_VISIBLE_CANDLES, Math.round(rawVisible))
  );
}

/**
 * Получает видимые свечи в диапазоне времени
 */
function getVisibleCandles(
  candles: Candle[],
  liveCandle: Candle | null,
  timeStart: number,
  timeEnd: number
): Candle[] {
  const visible: Candle[] = [];

  // Добавляем закрытые свечи в диапазоне
  for (const candle of candles) {
    // Свеча видна, если её startTime или endTime попадает в диапазон
    // или если она полностью покрывает диапазон
    if (
      (candle.startTime >= timeStart && candle.startTime <= timeEnd) ||
      (candle.endTime >= timeStart && candle.endTime <= timeEnd) ||
      (candle.startTime <= timeStart && candle.endTime >= timeEnd)
    ) {
      visible.push(candle);
    }
  }

  // Добавляем live-свечу, если она видна
  if (liveCandle) {
    if (
      (liveCandle.startTime >= timeStart && liveCandle.startTime <= timeEnd) ||
      (liveCandle.endTime >= timeStart && liveCandle.endTime <= timeEnd) ||
      (liveCandle.startTime <= timeStart && liveCandle.endTime >= timeEnd)
    ) {
      visible.push(liveCandle);
    }
  }

  return visible;
}

/**
 * Вычисляет priceMin и priceMax для видимых свечей с padding
 */
function calculatePriceRange(
  visibleCandles: Candle[],
  yPaddingRatio: number
): { priceMin: number; priceMax: number } | null {
  if (visibleCandles.length === 0) {
    return null;
  }

  let priceMin = Infinity;
  let priceMax = -Infinity;

  // Находим min(low) и max(high) среди видимых свечей
  for (const candle of visibleCandles) {
    priceMin = Math.min(priceMin, candle.low);
    priceMax = Math.max(priceMax, candle.high);
  }

  // Инвариант: priceMin < priceMax
  if (priceMin >= priceMax) {
    // Если все свечи имеют одинаковую цену, добавляем небольшой диапазон
    const center = priceMin;
    priceMin = center - 1;
    priceMax = center + 1;
  }

  // Добавляем padding
  const range = priceMax - priceMin;
  const padding = range * yPaddingRatio;

  return {
    priceMin: priceMin - padding,
    priceMax: priceMax + padding,
  };
}

/**
 * Применяет масштабный коэффициент к авто-диапазону цен.
 * Масштабирование от центра диапазона.
 * scaleFactor = 1.0 → без изменений, > 1.0 → шире (zoom out), < 1.0 → уже (zoom in)
 */
function applyYScaleFactor(
  priceRange: { priceMin: number; priceMax: number },
  scaleFactor: number
): { priceMin: number; priceMax: number } {
  const mid = (priceRange.priceMin + priceRange.priceMax) / 2;
  const range = priceRange.priceMax - priceRange.priceMin;
  const scaledRange = range * scaleFactor;
  return {
    priceMin: mid - scaledRange / 2,
    priceMax: mid + scaledRange / 2,
  };
}

export function useViewport({
  getCandles,
  getLiveCandle,
  timeframeMs,
  canvasRef,
  config = {},
  panInertiaRefs,
  onViewportChangeRef,
  getMarketStatus,
}: UseViewportParams): UseViewportReturn {
  const viewportRef = useRef<Viewport | null>(null);
  
  // 🔥 FLOW: Timeframe-aware visibleCandles - вычисляем на основе CSS-ширины canvas
  // 🔥 FIX: Используем clientWidth (CSS px), а не canvas.width (bitmap px = CSS * DPR)
  // На Retina (DPR=2) canvas.width = 2000 при CSS 1000px → вычислялось 2x больше видимых свечей
  const getCanvasWidth = (): number | null => {
    if (!canvasRef?.current) return null;
    return canvasRef.current.clientWidth || null;
  };
  
  // Вычисляем visibleCandles на основе canvasWidth и timeframeMs
  const calculatedVisibleCandles = calculateVisibleCandles(getCanvasWidth(), timeframeMs);
  
  const configRef = useRef<ViewportConfig>({ 
    ...DEFAULT_CONFIG, 
    visibleCandles: calculatedVisibleCandles,
    ...config 
  });
  
  // Ref для хранения функции recalculateViewport (определена позже)
  const recalculateViewportRef = useRef<(() => void) | null>(null);
  
  // 🔥 FLOW F1: Follow mode state
  const followModeRef = useRef<boolean>(true); // По умолчанию включен
  // 🔥 FLOW F3: Якорь «где сейчас рынок» — обновляется при price:update / candle:close
  const latestCandleTimeRef = useRef<number | null>(null);
  // 🔥 FLOW F1: Плавный сдвиг — целевой viewport и старт анимации
  const targetViewportRef = useRef<Viewport | null>(null);
  const followAnimationStartRef = useRef<{ viewport: Viewport; time: number } | null>(null);
  // 🔥 FLOW Y1: Y-scale drag state
  const yDragRef = useRef<{
    startY: number;
    startRange: number;
    autoRange: number; // авто-диапазон на момент начала drag (для вычисления yScaleFactor)
  } | null>(null);

  const yScaleFactorRef = useRef<number>(1.0);
  /** Timestamp of the last Y-lerp step for time-based interpolation */
  const lastYLerpTimeRef = useRef<number>(0);

  const returnToFollowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const RETURN_TO_FOLLOW_DELAY_MS = 3000;

  /**
   * Пересчет viewport на основе текущих данных
   * Используется при инициализации и при candle:close (если follow mode включен)
   */
  const recalculateViewport = (): void => {
    const candles = getCandles();
    const liveCandle = getLiveCandle();
    const { visibleCandles: visibleCount, yPaddingRatio, rightPaddingRatio } = configRef.current;

    // Если данных нет → viewport = null
    if (candles.length === 0 && !liveCandle) {
      viewportRef.current = null;
      return;
    }

    // 🔥 FLOW F1: Follow mode логика — целевой viewport идёт в аниматор, не прыжком
    if (followModeRef.current && liveCandle) {
      // Если follow mode включен, привязываем viewport к live-свече
      // 🔥 ВАЖНО: Сохраняем текущий масштаб (если viewport уже существует)
      const currentVp = viewportRef.current;
      const totalWindowMs = currentVp 
        ? (currentVp.timeEnd - currentVp.timeStart)  // Сохраняем текущий масштаб
        : (visibleCount * timeframeMs);               // Дефолт только при первом создании
      const rightPaddingMs = totalWindowMs * rightPaddingRatio;
      
      // Правая граница viewport = endTime live-свечи + right padding
      const timeEnd = liveCandle.endTime + rightPaddingMs;
      const timeStart = timeEnd - totalWindowMs;

      // Инвариант: timeStart < timeEnd
      if (timeStart >= timeEnd) {
        const minRange = timeframeMs;
        const vp: Viewport = {
          timeStart: timeEnd - minRange,
          timeEnd,
          priceMin: 0,
          priceMax: 100,
          yMode: 'auto',
        };
        viewportRef.current = vp;
        targetViewportRef.current = null;
        followAnimationStartRef.current = null;
        return;
      }

      const visibleCandlesList = getVisibleCandles(candles, liveCandle, timeStart, timeEnd);
      const currentYMode = viewportRef.current?.yMode || 'auto';

      const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
      if (!priceRange) {
        viewportRef.current = {
          timeStart,
          timeEnd,
          priceMin: 0,
          priceMax: 100,
          yMode: 'auto',
        };
        targetViewportRef.current = null;
        followAnimationStartRef.current = null;
        return;
      }

      let priceMin: number;
      let priceMax: number;

      // 🔥 FLOW Y2: manual → авто-диапазон * yScaleFactor
      if (currentYMode === 'manual') {
        const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
        priceMin = scaled.priceMin;
        priceMax = scaled.priceMax;
      } else {
        priceMin = priceRange.priceMin;
        priceMax = priceRange.priceMax;
      }

      const target: Viewport = {
        timeStart,
        timeEnd,
        priceMin,
        priceMax,
        yMode: currentYMode,
      };

      const current = viewportRef.current;
      if (!current) {
        viewportRef.current = { ...target };
        targetViewportRef.current = null;
        followAnimationStartRef.current = null;
        return;
      }

      // Плавный сдвиг: цель сохраняем, старт анимации задаст advanceFollowAnimation при первом кадре
      targetViewportRef.current = target;
      followAnimationStartRef.current = { viewport: { ...current }, time: 0 };
      return;
    }

    // 🔥 FLOW F1: Если follow mode выключен, НЕ меняем X координаты viewport
    // Сохраняем текущий viewport и обновляем только Y (auto-fit)
    const currentViewport = viewportRef.current;
    if (currentViewport) {
      // Обновляем только Y масштаб
      recalculateYOnly();
      return;
    }

    // Если viewport еще не инициализирован, инициализируем его
    // Определяем timeEnd
    let timeEnd: number;
    if (liveCandle) {
      timeEnd = liveCandle.endTime;
    } else if (candles.length > 0) {
      timeEnd = candles[candles.length - 1].endTime;
    } else {
      viewportRef.current = null;
      return;
    }

    // Вычисляем timeStart на основе visibleCandles
    const timeStart = timeEnd - visibleCount * timeframeMs;

    // Инвариант: timeStart < timeEnd
    if (timeStart >= timeEnd) {
      // Если timeframe слишком большой, используем минимальный диапазон
      const minRange = timeframeMs;
      viewportRef.current = {
        timeStart: timeEnd - minRange,
        timeEnd,
        priceMin: 0,
        priceMax: 100,
        yMode: 'auto',
      };
      return;
    }

    // Получаем видимые свечи
    const visibleCandlesList = getVisibleCandles(candles, liveCandle, timeStart, timeEnd);

    // Auto-fit по Y: вычисляем priceMin и priceMax
    const currentYMode = viewportRef.current?.yMode || 'auto';
    const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
    if (!priceRange) {
      viewportRef.current = {
        timeStart,
        timeEnd,
        priceMin: 0,
        priceMax: 100,
        yMode: 'auto',
      };
      return;
    }

    let priceMin: number;
    let priceMax: number;

    // 🔥 FLOW Y2: manual → авто-диапазон * yScaleFactor
    if (currentYMode === 'manual') {
      const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
      priceMin = scaled.priceMin;
      priceMax = scaled.priceMax;
    } else {
      priceMin = priceRange.priceMin;
      priceMax = priceRange.priceMax;
    }

    // Обновляем viewport
    viewportRef.current = {
      timeStart,
      timeEnd,
      priceMin,
      priceMax,
      yMode: currentYMode,
    };
  };

  /**
   * Обновление только Y масштаба (auto-fit) без изменения X
   * Используется при обновлении данных (price update)
   * 🔥 FLOW Y2: В manual режиме применяет yScaleFactor к авто-диапазону
   *   (вместо полного пропуска Y — авто-масштаб работает с пользовательским зумом)
   */
  const recalculateYOnly = (): void => {
    const currentViewport = viewportRef.current;
    if (!currentViewport) return;

    // Не мешаем активному drag
    if (yDragRef.current) return;

    const candles = getCandles();
    const liveCandle = getLiveCandle();
    const { yPaddingRatio } = configRef.current;

    // Получаем видимые свечи в текущем viewport (X не меняется!)
    const visibleCandles = getVisibleCandles(
      candles,
      liveCandle,
      currentViewport.timeStart,
      currentViewport.timeEnd
    );

    // Auto-fit по Y: вычисляем priceMin и priceMax
    const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio);

    if (!priceRange) {
      return; // Не меняем viewport если нет видимых свечей
    }

    // 🔥 FLOW Y2: Если manual — применяем yScaleFactor к авто-диапазону
    if (currentViewport.yMode === 'manual') {
      const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
      viewportRef.current = {
        ...currentViewport,
        priceMin: scaled.priceMin,
        priceMax: scaled.priceMax,
        yMode: 'manual',
      };
      return;
    }

    // Обновляем ТОЛЬКО Y, X остается прежним
    viewportRef.current = {
      ...currentViewport,
      priceMin: priceRange.priceMin,
      priceMax: priceRange.priceMax,
      yMode: 'auto', // Остается auto
    };
  };

  /**
   * Получить текущий viewport
   */
  const getViewport = (): Viewport | null => {
    return viewportRef.current ? { ...viewportRef.current } : null;
  };

  /**
   * Обновить viewport (для pan/zoom)
   * 🔥 FLOW Y1: Y пересчитывается через auto-fit только если yMode === 'auto'
   * 🔥 FLOW PAN-CLAMP: Viewport ограничен — минимум 10% должно пересекаться с данными
   */
  const updateViewport = (newViewport: Viewport): void => {
    // 🔥 FLOW PAN-CLAMP: Ограничиваем viewport по данным
    const candles = getCandles();
    const liveCandle = getLiveCandle();
    const dataTimeMin = candles.length > 0 ? candles[0].startTime : null;
    const dataTimeMax = liveCandle?.endTime ?? (candles.length > 0 ? candles[candles.length - 1].endTime : null);

    let vp = newViewport;
    if (dataTimeMin !== null && dataTimeMax !== null) {
      const { timeStart, timeEnd, clamped } = clampToDataBounds({
        timeStart: newViewport.timeStart,
        timeEnd: newViewport.timeEnd,
        dataTimeMin,
        dataTimeMax,
      });
      if (clamped) {
        vp = { ...newViewport, timeStart, timeEnd };
      }
    }

    const currentViewport = viewportRef.current;
    const currentYMode = currentViewport?.yMode || 'auto';

    // Получаем видимые свечи в новом viewport
    const visibleCandles = getVisibleCandles(
      candles,
      liveCandle,
      vp.timeStart,
      vp.timeEnd
    );

    // Auto-fit по Y: вычисляем priceMin и priceMax
    const { yPaddingRatio } = configRef.current;
    const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio);

    if (!priceRange) {
      // Если нет видимых свечей, используем дефолтные значения
      viewportRef.current = {
        timeStart: vp.timeStart,
        timeEnd: vp.timeEnd,
        priceMin: 0,
        priceMax: 100,
        yMode: currentYMode,
      };
      return;
    }

    // 🔥 FLOW Y2: manual → авто-диапазон * yScaleFactor (с lerp для плавности)
    // Целевые значения Y
    let targetMin: number;
    let targetMax: number;
    if (currentYMode === 'manual') {
      const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
      targetMin = scaled.priceMin;
      targetMax = scaled.priceMax;
    } else {
      targetMin = priceRange.priceMin;
      targetMax = priceRange.priceMax;
    }

    const currentMin = currentViewport?.priceMin ?? targetMin;
    const currentMax = currentViewport?.priceMax ?? targetMax;
    
    const EPSILON = 0.0001;
    const minDiff = Math.abs(currentMin - targetMin);
    const maxDiff = Math.abs(currentMax - targetMax);
    const alreadyAtTarget = minDiff < EPSILON && maxDiff < EPSILON;

    // Time-based smoothing: consistent across all refresh rates (60/120/144hz)
    const now = performance.now();
    const dt = now - (lastYLerpTimeRef.current || now);
    lastYLerpTimeRef.current = now;
    const BASE_SMOOTH = 0.3;
    const smoothFactor = alreadyAtTarget ? 1 : 1 - Math.pow(1 - BASE_SMOOTH, dt / 16.67);
    const smoothedMin = lerp(currentMin, targetMin, smoothFactor);
    const smoothedMax = lerp(currentMax, targetMax, smoothFactor);

    // Обновляем viewport с плавным Y
    viewportRef.current = {
      timeStart: vp.timeStart,
      timeEnd: vp.timeEnd,
      priceMin: smoothedMin,
      priceMax: smoothedMax,
      yMode: currentYMode,
    };
  };

  /**
   * 🔥 FLOW Y-SMOOTH: Плавная анимация Y-оси (stub - не используется в простом режиме)
   */
  const advanceYAnimation = (_now: number): void => {
    // Простой lerp в updateViewport делает всю работу
    // Эта функция оставлена для совместимости API
  };

  /** Плавный сдвиг viewport к цели. Вызывать каждый кадр из render loop при follow mode. */
  const advanceFollowAnimation = (now: number): void => {
    if (!followModeRef.current) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
      return;
    }

    const target = targetViewportRef.current;
    const start = followAnimationStartRef.current;
    if (!target || !start) return;

    // Первый кадр анимации — фиксируем время старта
    const startTime = start.time === 0 ? now : start.time;
    if (start.time === 0) {
      followAnimationStartRef.current = { viewport: start.viewport, time: now };
    }

    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / FOLLOW_SHIFT_DURATION_MS);
    const t = easeOutCubic(progress);

    const from = followAnimationStartRef.current ? followAnimationStartRef.current.viewport : target;
    viewportRef.current = {
      timeStart: lerp(from.timeStart, target.timeStart, t),
      timeEnd: lerp(from.timeEnd, target.timeEnd, t),
      priceMin: lerp(from.priceMin, target.priceMin, t),
      priceMax: lerp(from.priceMax, target.priceMax, t),
      yMode: target.yMode,
    };

    if (progress >= 1) {
      viewportRef.current = { ...target };
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    }
  };

  /**
   * FLOW F3: обновить якорь «текущее время рынка» (вызывать из useChart при price:update / candle:close)
   */
  const setLatestCandleTime = (ts: number): void => {
    latestCandleTimeRef.current = ts;
  };

  /**
   * FLOW F4: поставить viewport на актуальные свечи (плавно через advanceFollowAnimation)
   * 🔥 Сохраняет текущий масштаб (zoom level)
   */
  const followLatest = (): void => {
    // 🔥 FLOW C-INERTIA: Прерываем инерцию при включении follow
    if (panInertiaRefs) {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
    }

    const liveCandle = getLiveCandle();
    const candles = getCandles();
    const { visibleCandles: visibleCount, yPaddingRatio, rightPaddingRatio } = configRef.current;

    if (candles.length === 0 && !liveCandle) return;

    const anchorTime = liveCandle?.endTime ?? (candles.length > 0 ? candles[candles.length - 1].endTime : null);
    if (anchorTime == null) return;

    // 🔥 Сохраняем текущий масштаб (если viewport существует)
    const currentVp = viewportRef.current;
    const totalWindowMs = currentVp
      ? (currentVp.timeEnd - currentVp.timeStart)  // Сохраняем текущий масштаб
      : (visibleCount * timeframeMs);               // Дефолт только при первом создании
    const rightPaddingMs = totalWindowMs * rightPaddingRatio;
    const timeEnd = anchorTime + rightPaddingMs;
    const timeStart = timeEnd - totalWindowMs;

    if (timeStart >= timeEnd) return;

    const visibleCandlesList = getVisibleCandles(candles, liveCandle ?? null, timeStart, timeEnd);
    const currentYMode = viewportRef.current?.yMode || 'auto';
    
    const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
    if (!priceRange) return;

    let priceMin: number;
    let priceMax: number;

    // 🔥 FLOW Y2: manual → авто-диапазон * yScaleFactor
    if (currentYMode === 'manual') {
      const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
      priceMin = scaled.priceMin;
      priceMax = scaled.priceMax;
    } else {
      priceMin = priceRange.priceMin;
      priceMax = priceRange.priceMax;
    }

    const target: Viewport = {
      timeStart,
      timeEnd,
      priceMin,
      priceMax,
      yMode: currentYMode,
    };

    const current = viewportRef.current ? { ...viewportRef.current } : target;
    targetViewportRef.current = target;
    followAnimationStartRef.current = { viewport: current, time: 0 };
  };

  /** FLOW F8: показывать кнопку «Вернуться к текущим», если пользователь уехал влево или выключил follow */
  const EPS_MS = 50;
  const shouldShowReturnToLatest = (): boolean => {
    if (!followModeRef.current) return true;
    const vp = viewportRef.current;
    const latest = latestCandleTimeRef.current;
    if (vp && latest != null && vp.timeEnd < latest - EPS_MS) return true;
    return false;
  };

  // 🔥 FLOW RETURN-TO-FOLLOW: Отмена автовозврата
  const cancelReturnToFollow = (): void => {
    if (returnToFollowTimerRef.current) {
      clearTimeout(returnToFollowTimerRef.current);
      returnToFollowTimerRef.current = null;
    }
  };

  // 🔥 FLOW RETURN-TO-FOLLOW: Запланировать возврат в follow mode после pan
  // Важно: сохраняет текущий масштаб (zoom level)
  const scheduleReturnToFollow = (): void => {
    cancelReturnToFollow();
    
    returnToFollowTimerRef.current = setTimeout(() => {
      returnToFollowTimerRef.current = null;
      
      // Сохраняем текущий масштаб viewport
      const currentVp = viewportRef.current;
      if (!currentVp) {
        // Нет viewport — просто включаем follow mode
        followModeRef.current = true;
        return;
      }
      
      const currentWindowMs = currentVp.timeEnd - currentVp.timeStart;
      
      // Вычисляем целевую позицию с текущим масштабом
      const liveCandle = getLiveCandle();
      const candles = getCandles();
      const { rightPaddingRatio, yPaddingRatio } = configRef.current;
      
      // Если нет данных — просто включаем follow mode без анимации
      if (candles.length === 0 && !liveCandle) {
        followModeRef.current = true;
        return;
      }
      
      const anchorTime = liveCandle?.endTime ?? (candles.length > 0 ? candles[candles.length - 1].endTime : null);
      if (anchorTime == null) {
        followModeRef.current = true;
        return;
      }
      
      // Используем ТЕКУЩИЙ масштаб, а не дефолтный visibleCandles
      const rightPaddingMs = currentWindowMs * rightPaddingRatio;
      const timeEnd = anchorTime + rightPaddingMs;
      const timeStart = timeEnd - currentWindowMs;
      
      if (timeStart >= timeEnd) {
        followModeRef.current = true;
        return;
      }
      
      const visibleCandlesList = getVisibleCandles(candles, liveCandle ?? null, timeStart, timeEnd);
      const currentYMode = currentVp.yMode || 'auto';
      
      const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
      let priceMin: number;
      let priceMax: number;

      if (!priceRange) {
        // Не можем вычислить цены — включаем follow mode, используем текущие Y
        followModeRef.current = true;
        priceMin = currentVp.priceMin;
        priceMax = currentVp.priceMax;
      } else if (currentYMode === 'manual') {
        // 🔥 FLOW Y2: manual → авто-диапазон * yScaleFactor
        const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
        priceMin = scaled.priceMin;
        priceMax = scaled.priceMax;
      } else {
        priceMin = priceRange.priceMin;
        priceMax = priceRange.priceMax;
      }
      
      const target: Viewport = {
        timeStart,
        timeEnd,
        priceMin,
        priceMax,
        yMode: currentYMode,
      };
      
      // 🔥 ВКЛЮЧАЕМ follow mode ПОСЛЕ успешного вычисления target
      followModeRef.current = true;
      
      // Запускаем плавную анимацию к target
      targetViewportRef.current = target;
      followAnimationStartRef.current = { viewport: { ...currentVp }, time: 0 };
    }, RETURN_TO_FOLLOW_DELAY_MS);
  };

  // 🔥 FLOW F1: Follow mode методы
  const setFollowMode = (on: boolean): void => {
    cancelReturnToFollow();
    followModeRef.current = on;
    if (!on) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    } else {
      // 🔥 FLOW C-INERTIA: Прерываем инерцию при включении follow mode
      if (panInertiaRefs) {
        panInertiaRefs.activeRef.current = false;
        panInertiaRefs.velocityRef.current = 0;
      }
    }
  };

  const getFollowMode = (): boolean => {
    return followModeRef.current;
  };

  const toggleFollowMode = (): void => {
    cancelReturnToFollow();
    followModeRef.current = !followModeRef.current;
    if (!followModeRef.current) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    }
    // 🔥 FLOW C-INERTIA: Прерываем инерцию при включении follow mode
    if (panInertiaRefs) {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
    }
    recalculateViewport();
  };

  // 🔥 FLOW Y1 + Y2: Y-scale drag методы
  const beginYScaleDrag = (startY: number): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const startRange = viewport.priceMax - viewport.priceMin;

    // Вычисляем авто-диапазон для текущих видимых свечей
    const candles_ = getCandles();
    const liveCandle_ = getLiveCandle();
    const { yPaddingRatio } = configRef.current;
    const visibleCandlesList = getVisibleCandles(candles_, liveCandle_, viewport.timeStart, viewport.timeEnd);
    const autoRange_ = calculatePriceRange(visibleCandlesList, yPaddingRatio);
    const autoRangeValue = autoRange_ ? (autoRange_.priceMax - autoRange_.priceMin) : startRange;

    yDragRef.current = {
      startY,
      startRange,
      autoRange: autoRangeValue,
    };

    // Переключаем в manual режим
    viewportRef.current = {
      ...viewport,
      yMode: 'manual',
    };
  };

  const updateYScaleDrag = (currentY: number): void => {
    const viewport = viewportRef.current;
    const dragState = yDragRef.current;
    if (!viewport || !dragState) return;

    // Вычисляем изменение по Y
    const dy = currentY - dragState.startY;
    // Чувствительность: drag вниз (dy > 0) = сжатие, drag вверх (dy < 0) = растягивание
    const scaleFactor = 1 + dy * 0.005; // Вниз = уменьшение, вверх = увеличение

    // Ограничения: относительные к начальному диапазону (чтобы работало на любых парах — BTC, forex и т.д.)
    const minRange = Math.max(1e-10, dragState.startRange * 0.01); // не уже 1% от стартового
    const maxRange = dragState.startRange * 100; // не шире чем в 100 раз
    
    const newRange = Math.max(minRange, Math.min(maxRange, dragState.startRange * scaleFactor));

    // 🔥 FLOW Y2: Обновляем yScaleFactor = newRange / autoRange
    yScaleFactorRef.current = newRange / dragState.autoRange;

    // Центр масштабирования - середина текущего диапазона
    const mid = (viewport.priceMin + viewport.priceMax) / 2;
    const newPriceMin = mid - newRange / 2;
    const newPriceMax = mid + newRange / 2;

    // Обновляем viewport
    viewportRef.current = {
      ...viewport,
      priceMin: newPriceMin,
      priceMax: newPriceMax,
      yMode: 'manual',
    };
  };

  const endYScaleDrag = (): void => {
    yDragRef.current = null;
  };

  const resetYScale = (): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // 🔥 FLOW Y2: Сбрасываем коэффициент масштабирования
    yScaleFactorRef.current = 1.0;

    // Переключаем обратно в auto режим и пересчитываем
    viewportRef.current = {
      ...viewport,
      yMode: 'auto',
    };
    recalculateYOnly();
  };

  // Сохраняем ссылку на recalculateViewport для использования в useEffect
  recalculateViewportRef.current = recalculateViewport;
  
  // 🔥 FLOW: Обновляем visibleCandles при изменении canvas размера или timeframe
  useEffect(() => {
    const updateVisibleCandles = () => {
      const newVisibleCandles = calculateVisibleCandles(getCanvasWidth(), timeframeMs);
      if (configRef.current.visibleCandles !== newVisibleCandles) {
        configRef.current.visibleCandles = newVisibleCandles;
        // Пересчитываем viewport с новым количеством свечей
        recalculateViewportRef.current?.();
      }
    };
    
    // Обновляем при изменении размера canvas
    const resizeObserver = canvasRef?.current 
      ? new ResizeObserver(() => {
          updateVisibleCandles();
        })
      : null;
    
    if (resizeObserver && canvasRef?.current) {
      resizeObserver.observe(canvasRef.current);
    }
    
    // Обновляем при изменении timeframe
    updateVisibleCandles();
    
    return () => {
      resizeObserver?.disconnect();
    };
  }, [timeframeMs, canvasRef]);
  
  /**
   * 🔥 FLOW: Timeframe Switch Reset - полный сброс viewport
   * Сбрасывает viewport в дефолтное состояние при смене timeframe
   */
  const reset = (): void => {
    // Сбрасываем viewport в null (будет пересчитан при следующем recalculateViewport)
    viewportRef.current = null;
    
    // Сбрасываем follow mode в true
    followModeRef.current = true;
    
    // Очищаем анимации
    targetViewportRef.current = null;
    followAnimationStartRef.current = null;
    
    // Очищаем Y-scale drag и сбрасываем масштаб
    yDragRef.current = null;
    yScaleFactorRef.current = 1.0;
    
    // Очищаем якорь времени
    latestCandleTimeRef.current = null;
    
    // Сбрасываем config в дефолтное состояние (visibleCandles пересчитается автоматически)
    const calculatedVisibleCandles = calculateVisibleCandles(getCanvasWidth(), timeframeMs);
    configRef.current = {
      ...DEFAULT_CONFIG,
      visibleCandles: calculatedVisibleCandles,
      ...config,
    };
  };

  /**
   * 🔥 FLOW C-INERTIA: Pan inertia tick (ядро инерции)
   * Применяет velocity к viewport, уменьшает её с friction, останавливает при затухании
   */
  const PAN_FRICTION_PER_16MS = 0.92;
  const PAN_STOP_EPSILON = 0.02;
  const lastInertiaTimeRef = useRef<number>(0);

  const advancePanInertia = (now: number): void => {
    if (!panInertiaRefs) return;

    if (getMarketStatus && getMarketStatus() !== 'OPEN') {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
      return;
    }

    if (followModeRef.current) {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
      return;
    }

    if (!panInertiaRefs.activeRef.current) return;

    const velocity = panInertiaRefs.velocityRef.current;
    if (Math.abs(velocity) < PAN_STOP_EPSILON) {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const canvas = canvasRef?.current;
    if (!canvas) return;

    // Real delta-time for frame-rate independent inertia
    const prev = lastInertiaTimeRef.current || now;
    const dt = Math.min(now - prev, 64); // cap to avoid spiral after tab switch
    lastInertiaTimeRef.current = now;
    const deltaX = velocity * dt;

    // Вычисляем pixelsPerMs
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const pixelsPerMs = canvas.clientWidth / timeRange;

    // Pan viewport
    const newViewport = panViewportTime({
      viewport,
      deltaX,
      pixelsPerMs,
    });

    // Обновляем viewport (Y пересчитается через auto-fit в updateViewport)
    updateViewport(newViewport);

    // Вызываем callback для загрузки истории (FLOW G6) - вызывается из useChart через ref
    onViewportChangeRef?.current?.(newViewport);

    // Time-based friction: consistent deceleration across all refresh rates
    panInertiaRefs.velocityRef.current *= Math.pow(PAN_FRICTION_PER_16MS, dt / 16);
  };

  // Первоначальный расчет viewport
  useEffect(() => {
    recalculateViewport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 FIX: Очищаем returnToFollow таймер при unmount (утечка памяти + callback на мёртвом компоненте)
  // Аналогично useLineChart.ts — при unmount CandleChart таймер должен быть отменён
  useEffect(() => {
    return () => {
      if (returnToFollowTimerRef.current) {
        clearTimeout(returnToFollowTimerRef.current);
        returnToFollowTimerRef.current = null;
      }
    };
  }, []);

  return {
    viewportRef: viewportRef as React.RefObject<Viewport | null>,
    getViewport,
    recalculateViewport,
    recalculateYOnly,
    updateViewport,
    config: configRef.current,
    // 🔥 FLOW F1 / F3–F5 / F8: Follow mode API
    setFollowMode,
    getFollowMode,
    toggleFollowMode,
    setLatestCandleTime,
    followLatest,
    shouldShowReturnToLatest,
    advanceFollowAnimation,
    // 🔥 FLOW Y1: Y-scale drag API
    beginYScaleDrag,
    updateYScaleDrag,
    endYScaleDrag,
    resetYScale,
    // 🔥 FLOW: Timeframe Switch Reset
    reset,
    // 🔥 FLOW C-INERTIA: Pan inertia API
    advancePanInertia,
    // 🔥 FLOW Y-SMOOTH: Y-axis animation API
    advanceYAnimation,
    // 🔥 FLOW RETURN-TO-FOLLOW: Auto return API
    scheduleReturnToFollow,
    cancelReturnToFollow,
  };
}
