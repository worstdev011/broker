/** Viewport state management: pan, zoom, follow mode, Y-scale, and auto-fit. */

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
  panInertiaRefs?: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  };
  onViewportChangeRef?: React.MutableRefObject<((viewport: Viewport) => void) | null>;
  getMarketStatus?: () => 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';
  getServerTimeMs?: () => number;
  /** CSS pixels of floating panel at the bottom — chart content shifts up to avoid it */
  extraBottomPx?: number;
}

// 🔥 FLOW: Timeframe-aware visibleCandles - UX константы
const TARGET_CANDLE_PX = 14; // Визуально комфортная ширина свечи в пикселях
const MIN_VISIBLE_CANDLES = 35; // Минимум свечей (ограничение max zoom in)
const MAX_VISIBLE_CANDLES = 300; // Максимум свечей на экране
const BASE_TIMEFRAME_MS = 5000; // Базовый таймфрейм (5s) в миллисекундах

const FOLLOW_SHIFT_DURATION_MS = 350;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

interface UseViewportReturn {
  viewportRef: React.RefObject<Viewport | null>;
  getViewport: () => Viewport | null;
  recalculateViewport: () => void;
  recalculateYOnly: () => void; // Только Y, без изменения X
  updateViewport: (newViewport: Viewport) => void;
  config: ViewportConfig;
  // 🔥 FLOW F1 / F3-F5 / F8: Follow mode API
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
  /** Непрерывное обновление viewport X по серверному времени в follow mode (каждый кадр). */
  advanceContinuousFollow: () => void;
  // 🔥 FLOW Y1: Y-scale drag API
  beginYScaleDrag: (startY: number) => void;
  updateYScaleDrag: (currentY: number) => void;
  endYScaleDrag: () => void;
  resetYScale: () => void;
  // 🔥 FLOW: Timeframe Switch Reset - полный сброс viewport
  reset: () => void;
  skipNextFollowAnimation: () => void;
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
    return DEFAULT_CONFIG.visibleCandles;
  }

  // Базовое количество свечей для базового таймфрейма (5s)
  const baseVisible = canvasWidth / TARGET_CANDLE_PX;

  // Логарифмический множитель: плавно увеличиваем глубину для больших ТФ,
  // но не линейно (иначе 1h показывал бы 720x свечей)
  const ratio = timeframeMs / BASE_TIMEFRAME_MS;
  const timeframeMultiplier = ratio <= 1 ? 1 : 1 + Math.log2(ratio);

  const rawVisible = baseVisible * timeframeMultiplier;

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
 * @param bottomExtraPaddingRatio дополнительный отступ снизу (чтобы свечи не рисовались под плавающей панелью)
 */
function calculatePriceRange(
  visibleCandles: Candle[],
  yPaddingRatio: number,
  bottomExtraPaddingRatio = 0,
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

  // Добавляем симметричный padding и дополнительный отступ снизу
  const range = priceMax - priceMin;
  const padding = range * yPaddingRatio;

  return {
    priceMin: priceMin - padding - range * bottomExtraPaddingRatio,
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

/**
 * Compute the right-edge anchor for follow mode using real server time.
 * Returns the end of the current time-slot so the viewport keeps advancing
 * even when no ticks arrive.
 */
function getFollowAnchor(
  liveCandle: Candle,
  serverTimeMs: number | undefined,
  timeframeMs: number,
): number {
  if (!serverTimeMs) return liveCandle.endTime;
  const elapsed = Math.max(0, serverTimeMs - liveCandle.startTime);
  const slotsElapsed = Math.max(1, Math.ceil(elapsed / timeframeMs));
  return Math.max(liveCandle.endTime, liveCandle.startTime + slotsElapsed * timeframeMs);
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
  getServerTimeMs,
  extraBottomPx = 0,
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

  // Keep fresh ref to extraBottomPx so viewport calculations always use the latest value
  const extraBottomPxRef = useRef<number>(extraBottomPx ?? 0);
  extraBottomPxRef.current = extraBottomPx ?? 0;

  /** Convert CSS pixel bottom offset → price-range ratio using canvas height.
   *  Adds an extra 32px gap so the time-axis labels stay fully visible above the panel. */
  const getBottomExtraPaddingRatio = (): number => {
    const h = canvasRef?.current?.clientHeight;
    if (!h || h <= 0 || extraBottomPxRef.current <= 0) return 0;
    return (extraBottomPxRef.current + 32) / h;
  };
  
  // Ref для хранения функции recalculateViewport (определена позже)
  const recalculateViewportRef = useRef<(() => void) | null>(null);
  
  // 🔥 FLOW F1: Follow mode state
  const followModeRef = useRef<boolean>(true); // По умолчанию включен
  // 🔥 FLOW F3: Якорь «где сейчас рынок» - обновляется при price:update / candle:close
  const latestCandleTimeRef = useRef<number | null>(null);
  // 🔥 FLOW F1: Плавный сдвиг - целевой viewport и старт анимации
  const targetViewportRef = useRef<Viewport | null>(null);
  const followAnimationStartRef = useRef<{ viewport: Viewport; time: number } | null>(null);
  // 🔥 FLOW Y1: Y-scale drag state
  const yDragRef = useRef<{
    startY: number;
    startRange: number;
    autoRange: number; // авто-диапазон на момент начала drag (для вычисления yScaleFactor)
  } | null>(null);

  const yScaleFactorRef = useRef<number>(1.0);

  // 🔥 FLOW Y-SMOOTH: Continuous Y-axis animation state
  const yTargetMinRef = useRef<number | null>(null);
  const yTargetMaxRef = useRef<number | null>(null);
  const lastYAnimTimeRef = useRef<number>(0);

  // When > 0, recalculateViewport will snap instead of animating until this timestamp
  const skipFollowAnimationUntilRef = useRef<number>(0);

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

    // 🔥 FLOW F1: Follow mode логика - целевой viewport идёт в аниматор, не прыжком
    if (followModeRef.current && liveCandle) {
      // Если follow mode включен, привязываем viewport к live-свече
      // 🔥 ВАЖНО: Сохраняем текущий масштаб (если viewport уже существует)
      const currentVp = viewportRef.current;
      const totalWindowMs = currentVp 
        ? (currentVp.timeEnd - currentVp.timeStart)  // Сохраняем текущий масштаб
        : (visibleCount * timeframeMs);               // Дефолт только при первом создании
      const rightPaddingMs = totalWindowMs * rightPaddingRatio;
      
      // Правая граница viewport = anchor (на основе серверного времени) + right padding
      const anchor = getFollowAnchor(liveCandle, getServerTimeMs?.(), timeframeMs);
      const timeEnd = anchor + rightPaddingMs;
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

      const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio, getBottomExtraPaddingRatio());
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
      // Keep Y targets in sync so advanceYAnimation stays consistent after follow ends
      yTargetMinRef.current = priceMin;
      yTargetMaxRef.current = priceMax;

      if (!current) {
        viewportRef.current = { ...target };
        targetViewportRef.current = null;
        followAnimationStartRef.current = null;
        return;
      }

      if (performance.now() < skipFollowAnimationUntilRef.current) {
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
    const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio, getBottomExtraPaddingRatio());
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
   *   (вместо полного пропуска Y - авто-масштаб работает с пользовательским зумом)
   */
  const recalculateYOnly = (): void => {
    const currentViewport = viewportRef.current;
    if (!currentViewport) return;

    // Не мешаем активному drag
    if (yDragRef.current) return;

    const candles = getCandles();
    const liveCandle = getLiveCandle();
    const { yPaddingRatio } = configRef.current;

    // If follow-animation is active, use the target viewport's X range
    // so Y is computed for where we're heading, not where we are mid-lerp
    const target = targetViewportRef.current;
    const animating = !!(target && followAnimationStartRef.current);
    const xStart = animating ? target.timeStart : currentViewport.timeStart;
    const xEnd = animating ? target.timeEnd : currentViewport.timeEnd;

    const visibleCandles = getVisibleCandles(candles, liveCandle, xStart, xEnd);

    const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio, getBottomExtraPaddingRatio());

    if (!priceRange) {
      return;
    }

    let priceMin: number;
    let priceMax: number;

    if (currentViewport.yMode === 'manual') {
      const scaled = applyYScaleFactor(priceRange, yScaleFactorRef.current);
      priceMin = scaled.priceMin;
      priceMax = scaled.priceMax;
    } else {
      priceMin = priceRange.priceMin;
      priceMax = priceRange.priceMax;
    }

    // During follow-animation, update the target instead of viewport directly
    // so the lerp stays smooth and doesn't "jump" on incoming ticks
    if (animating && target) {
      targetViewportRef.current = { ...target, priceMin, priceMax };
      yTargetMinRef.current = priceMin;
      yTargetMaxRef.current = priceMax;
      return;
    }

    // Update Y targets for smooth animation via advanceYAnimation
    yTargetMinRef.current = priceMin;
    yTargetMaxRef.current = priceMax;
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
   * 🔥 FLOW PAN-CLAMP: Viewport ограничен - минимум 10% должно пересекаться с данными
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
    const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio, getBottomExtraPaddingRatio());

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

    // 🔥 FLOW Y2: manual → авто-диапазон * yScaleFactor
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

    // Store targets for continuous animation in advanceYAnimation
    yTargetMinRef.current = targetMin;
    yTargetMaxRef.current = targetMax;

    // Use current Y if available, otherwise snap to target immediately
    const priceMin = currentViewport?.priceMin ?? targetMin;
    const priceMax = currentViewport?.priceMax ?? targetMax;

    viewportRef.current = {
      timeStart: vp.timeStart,
      timeEnd: vp.timeEnd,
      priceMin,
      priceMax,
      yMode: currentYMode,
    };
  };

  /**
   * 🔥 FLOW Y-SMOOTH: Continuous Y-axis animation.
   * Called every frame from the render loop. Smoothly interpolates priceMin/priceMax
   * towards the target values using frame-rate independent exponential decay.
   */
  const Y_SMOOTH_SPEED = 20; // Higher = faster convergence (units: 1/second)
  const Y_SNAP_EPSILON = 1e-8;

  const advanceYAnimation = (now: number): void => {
    const vp = viewportRef.current;
    if (!vp) return;

    const targetMin = yTargetMinRef.current;
    const targetMax = yTargetMaxRef.current;
    if (targetMin === null || targetMax === null) return;

    // Don't animate during active Y-drag
    if (yDragRef.current) return;

    // Skip if follow-animation is active (it handles its own Y lerp)
    if (targetViewportRef.current && followAnimationStartRef.current) return;

    const dt = lastYAnimTimeRef.current > 0
      ? Math.min(now - lastYAnimTimeRef.current, 32) // Cap at ~2 frames to avoid jumps
      : 16;
    lastYAnimTimeRef.current = now;

    const minDiff = Math.abs(vp.priceMin - targetMin);
    const maxDiff = Math.abs(vp.priceMax - targetMax);
    const range = Math.abs(targetMax - targetMin) || 1;

    // Snap when close enough (relative to the price range)
    if (minDiff / range < Y_SNAP_EPSILON && maxDiff / range < Y_SNAP_EPSILON) {
      if (vp.priceMin !== targetMin || vp.priceMax !== targetMax) {
        viewportRef.current = { ...vp, priceMin: targetMin, priceMax: targetMax };
      }
      return;
    }

    // Exponential decay: t = 1 - e^(-speed * dt/1000)
    // This is frame-rate independent and feels smooth on 60/120/144hz
    const t = 1 - Math.exp(-Y_SMOOTH_SPEED * dt / 1000);
    const newMin = lerp(vp.priceMin, targetMin, t);
    const newMax = lerp(vp.priceMax, targetMax, t);

    viewportRef.current = { ...vp, priceMin: newMin, priceMax: newMax };
  };

  /** Плавный сдвиг viewport к цели. Вызывать каждый кадр из render loop при follow mode.
   *  X movement is handled by advanceContinuousFollow — this only animates Y (price axis). */
  const advanceFollowAnimation = (now: number): void => {
    if (!followModeRef.current) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
      return;
    }

    const target = targetViewportRef.current;
    const start = followAnimationStartRef.current;
    if (!target || !start) return;

    const startTime = start.time === 0 ? now : start.time;
    if (start.time === 0) {
      followAnimationStartRef.current = { viewport: start.viewport, time: now };
    }

    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / FOLLOW_SHIFT_DURATION_MS);
    const t = easeOutCubic(progress);

    const from = followAnimationStartRef.current ? followAnimationStartRef.current.viewport : target;

    const currentVp = viewportRef.current;
    viewportRef.current = {
      timeStart: currentVp ? currentVp.timeStart : lerp(from.timeStart, target.timeStart, t),
      timeEnd: currentVp ? currentVp.timeEnd : lerp(from.timeEnd, target.timeEnd, t),
      priceMin: lerp(from.priceMin, target.priceMin, t),
      priceMax: lerp(from.priceMax, target.priceMax, t),
      yMode: target.yMode,
    };

    if (progress >= 1) {
      const vp = viewportRef.current!;
      viewportRef.current = { ...vp, priceMin: target.priceMin, priceMax: target.priceMax };
      yTargetMinRef.current = target.priceMin;
      yTargetMaxRef.current = target.priceMax;
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    }
  };

  /**
   * Continuous follow: update viewport X every frame based on real server time.
   * Uses smooth lerp so the viewport glides continuously instead of snapping.
   * Runs even when a discrete follow animation (candle:close) is active —
   * advanceFollowAnimation handles only Y in that case.
   */
  const CONTINUOUS_FOLLOW_LERP = 0.07;

  const advanceContinuousFollow = (): void => {
    if (!followModeRef.current) return;

    const currentVp = viewportRef.current;
    if (!currentVp) return;

    const now = getServerTimeMs ? getServerTimeMs() : Date.now();
    const liveCandle = getLiveCandle();
    if (!liveCandle) return;

    const { rightPaddingRatio } = configRef.current;
    const totalWindowMs = currentVp.timeEnd - currentVp.timeStart;
    const rightPaddingMs = totalWindowMs * rightPaddingRatio;

    const anchor = getFollowAnchor(liveCandle, now, timeframeMs);
    const desiredTimeEnd = anchor + rightPaddingMs;
    const desiredTimeStart = desiredTimeEnd - totalWindowMs;

    const diffEnd = Math.abs(currentVp.timeEnd - desiredTimeEnd);
    if (diffEnd < 0.5) return;

    const newTimeEnd = lerp(currentVp.timeEnd, desiredTimeEnd, CONTINUOUS_FOLLOW_LERP);
    const newTimeStart = lerp(currentVp.timeStart, desiredTimeStart, CONTINUOUS_FOLLOW_LERP);

    viewportRef.current = {
      ...currentVp,
      timeStart: newTimeStart,
      timeEnd: newTimeEnd,
    };

    // Keep the follow-animation target X in sync so it doesn't fight
    if (targetViewportRef.current) {
      targetViewportRef.current = {
        ...targetViewportRef.current,
        timeStart: newTimeStart,
        timeEnd: newTimeEnd,
      };
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

    const rawAnchor = liveCandle?.endTime ?? (candles.length > 0 ? candles[candles.length - 1].endTime : null);
    if (rawAnchor == null) return;
    const anchorTime = liveCandle
      ? getFollowAnchor(liveCandle, getServerTimeMs?.(), timeframeMs)
      : rawAnchor;

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
    
    const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio, getBottomExtraPaddingRatio());
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

  /** FLOW F8: показывать кнопку «Вернуться к текущим» только когда live-свеча за пределами экрана */
  const shouldShowReturnToLatest = (): boolean => {
    const vp = viewportRef.current;
    if (!vp) return false;

    const liveCandle = getLiveCandle();
    if (!liveCandle) return false;

    // Live candle is off-screen to the right or left → show button
    return liveCandle.startTime >= vp.timeEnd || liveCandle.endTime <= vp.timeStart;
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
        // Нет viewport - просто включаем follow mode
        followModeRef.current = true;
        return;
      }
      
      const currentWindowMs = currentVp.timeEnd - currentVp.timeStart;
      
      // Вычисляем целевую позицию с текущим масштабом
      const liveCandle = getLiveCandle();
      const candles = getCandles();
      const { rightPaddingRatio, yPaddingRatio } = configRef.current;
      
      // Если нет данных - просто включаем follow mode без анимации
      if (candles.length === 0 && !liveCandle) {
        followModeRef.current = true;
        return;
      }
      
      const rawAnchor = liveCandle?.endTime ?? (candles.length > 0 ? candles[candles.length - 1].endTime : null);
      if (rawAnchor == null) {
        followModeRef.current = true;
        return;
      }
      const anchorTime = liveCandle
        ? getFollowAnchor(liveCandle, getServerTimeMs?.(), timeframeMs)
        : rawAnchor;
      
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
      
      const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio, getBottomExtraPaddingRatio());
      let priceMin: number;
      let priceMax: number;

      if (!priceRange) {
        // Не можем вычислить цены - включаем follow mode, используем текущие Y
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
    const autoRange_ = calculatePriceRange(visibleCandlesList, yPaddingRatio, getBottomExtraPaddingRatio());
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

    // Auto-fit range is the maximum stretch (minimum range value).
    // User can only shrink the chart (increase range), not stretch beyond auto-fit.
    const minRange = dragState.autoRange;
    const maxRange = dragState.startRange * 100;
    
    const newRange = Math.max(minRange, Math.min(maxRange, dragState.startRange * scaleFactor));

    // 🔥 FLOW Y2: Обновляем yScaleFactor = newRange / autoRange
    // Clamp >= 1.0: auto-fit is the maximum stretch, only shrinking allowed
    yScaleFactorRef.current = Math.max(1.0, newRange / dragState.autoRange);

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
    // Sync Y targets to where the drag left the viewport,
    // so advanceYAnimation doesn't snap back to pre-drag values
    const vp = viewportRef.current;
    if (vp) {
      yTargetMinRef.current = vp.priceMin;
      yTargetMaxRef.current = vp.priceMax;
    }
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
  const SKIP_FOLLOW_ANIM_WINDOW_MS = 600;

  const skipNextFollowAnimation = (): void => {
    skipFollowAnimationUntilRef.current = performance.now() + SKIP_FOLLOW_ANIM_WINDOW_MS;
  };

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
    
    // Очищаем Y-animation targets
    yTargetMinRef.current = null;
    yTargetMaxRef.current = null;
    lastYAnimTimeRef.current = 0;

    skipFollowAnimationUntilRef.current = 0;
    
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
      lastInertiaTimeRef.current = 0;
      return;
    }

    if (followModeRef.current) {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
      lastInertiaTimeRef.current = 0;
      return;
    }

    if (!panInertiaRefs.activeRef.current) {
      lastInertiaTimeRef.current = 0;
      return;
    }

    const velocity = panInertiaRefs.velocityRef.current;
    if (Math.abs(velocity) < PAN_STOP_EPSILON) {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
      lastInertiaTimeRef.current = 0;
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const canvas = canvasRef?.current;
    if (!canvas) return;

    const dt = lastInertiaTimeRef.current > 0
      ? Math.min(now - lastInertiaTimeRef.current, 32)
      : 16;
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
  // Аналогично useLineChart.ts - при unmount CandleChart таймер должен быть отменён
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
    // 🔥 FLOW F1 / F3-F5 / F8: Follow mode API
    setFollowMode,
    getFollowMode,
    toggleFollowMode,
    setLatestCandleTime,
    followLatest,
    shouldShowReturnToLatest,
    advanceFollowAnimation,
    advanceContinuousFollow,
    // 🔥 FLOW Y1: Y-scale drag API
    beginYScaleDrag,
    updateYScaleDrag,
    endYScaleDrag,
    resetYScale,
    // 🔥 FLOW: Timeframe Switch Reset
    reset,
    skipNextFollowAnimation,
    // 🔥 FLOW C-INERTIA: Pan inertia API
    advancePanInertia,
    // 🔥 FLOW Y-SMOOTH: Y-axis animation API
    advanceYAnimation,
    // 🔥 FLOW RETURN-TO-FOLLOW: Auto return API
    scheduleReturnToFollow,
    cancelReturnToFollow,
  };
}
