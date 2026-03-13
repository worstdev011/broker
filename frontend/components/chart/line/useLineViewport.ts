/**
 * FLOW LINE-2: Line Viewport - СЕРДЦЕ линейного графика
 * 
 * ИДЕЯ: Viewport — это временное окно, а не индекс.
 * 
 * Поведение:
 * - autoFollow = true: окно автоматически едет вправо за новыми тиками
 * - autoFollow = false: окно зафиксировано (после pan/zoom)
 * - zoom: меняет ширину временного окна
 * - pan: сдвигает окно влево/вправо
 */

import { useRef } from 'react';
import type { LineViewport } from './lineTypes';
import type { TimePriceViewport } from '../internal/render/ui/viewport.types';
import { clampToDataBounds } from '../internal/interactions/math';

/** Начальная ширина временного окна линейного графика (экспортируется для useLineChart) */
export const DEFAULT_WINDOW_MS = 420_000; // 420 секунд (7 минут) по умолчанию
const RIGHT_PADDING_RATIO = 0.30; // 30% свободного места справа

// 🔥 Лимиты масштабирования — viewport не может быть сильно меньше или больше дефолтного
const MIN_WINDOW_MS = DEFAULT_WINDOW_MS * 0.5;  // ~3.5 мин — максимальный zoom in
const MAX_WINDOW_MS = DEFAULT_WINDOW_MS * 1.5;  // ~10.5 мин — максимальный zoom out

export function useLineViewport() {
  const now = Date.now();
  const rightPaddingMs = DEFAULT_WINDOW_MS * RIGHT_PADDING_RATIO;
  const viewportRef = useRef<LineViewport>({
    timeEnd: now + rightPaddingMs,
    timeStart: now + rightPaddingMs - DEFAULT_WINDOW_MS,
    autoFollow: true, // 🔥 По умолчанию follow mode ВКЛЮЧЕН
  });
  
  // Кэш для priceMin/priceMax (обновляется извне)
  const priceRangeRef = useRef<{ min: number; max: number } | null>(null);

  // 🔥 FLOW PAN-CLAMP: Границы данных для ограничения pan (обновляется извне)
  const dataBoundsRef = useRef<{ timeMin: number; timeMax: number } | null>(null);

  // Якорь времени — связывает performance.now() с wall/server time
  const timeAnchorRef = useRef<{ wallTime: number; perfTime: number }>({
    wallTime: Date.now(),
    perfTime: performance.now(),
  });

  // Second-grid scrolling (Pocket Option style):
  // Every whole second (wall clock) the viewport steps exactly 1000ms
  // to the right with a smooth easing animation.  Between seconds the
  // viewport is completely stationary — only the live line grows.
  const SCROLL_STEP_MS = 1000;
  const lastAdvancePerfRef = useRef<number>(0);
  const scrollTargetEndRef = useRef<number | null>(null);
  const lastSecondRef = useRef<number>(0);

  function getWallTime(perfNow: number): number {
    const anchor = timeAnchorRef.current;
    return anchor.wallTime + (perfNow - anchor.perfTime);
  }

  function calibrateTime(serverTimestamp: number): void {
    const perfNow = performance.now();
    const currentEstimate = getWallTime(perfNow);
    const error = serverTimestamp - currentEstimate;

    if (Math.abs(error) > 50) {
      timeAnchorRef.current = {
        wallTime: timeAnchorRef.current.wallTime + error * 0.3,
        perfTime: timeAnchorRef.current.perfTime,
      };
    }
  }

  // Smooth easing factor: higher = faster convergence (0..1 per frame at 60fps).
  const SCROLL_EASE_SPEED = 5;

  /**
   * Second-grid viewport scrolling with smooth easing.
   *
   * Each time wallNow crosses a whole-second boundary the scroll
   * *target* advances by exactly 1000ms. Every frame, the actual
   * viewport position eases towards the target using exponential
   * interpolation — producing a silky-smooth slide instead of a
   * 1-second jump.
   */
  function advanceContinuousFollow(perfNow: number): void {
    if (!viewportRef.current.autoFollow) return;

    const vp = viewportRef.current;
    const windowMs = vp.timeEnd - vp.timeStart;
    const wallNow = getWallTime(perfNow);
    const currentSecond = Math.floor(wallNow / SCROLL_STEP_MS);

    if (lastSecondRef.current === 0) {
      lastSecondRef.current = currentSecond;
    }

    // New second crossed — advance target
    if (currentSecond > lastSecondRef.current) {
      const secondsElapsed = currentSecond - lastSecondRef.current;
      lastSecondRef.current = currentSecond;

      const stepMs = secondsElapsed * SCROLL_STEP_MS;
      if (scrollTargetEndRef.current !== null) {
        scrollTargetEndRef.current += stepMs;
      } else {
        scrollTargetEndRef.current = vp.timeEnd + stepMs;
      }
    }

    const target = scrollTargetEndRef.current;
    if (target === null) return;

    // Smooth exponential easing towards target
    const dt = lastAdvancePerfRef.current > 0
      ? Math.min(perfNow - lastAdvancePerfRef.current, 50)
      : 16;
    lastAdvancePerfRef.current = perfNow;

    const alpha = 1 - Math.exp(-SCROLL_EASE_SPEED * dt / 1000);
    const diff = target - vp.timeEnd;

    if (Math.abs(diff) < 0.5) {
      vp.timeEnd = target;
      scrollTargetEndRef.current = null;
    } else {
      vp.timeEnd += diff * alpha;
    }

    vp.timeStart = vp.timeEnd - windowMs;
  }

  /**
   * Zoom: изменить ширину временного окна
   * @param factor > 1 = увеличить (меньше времени видно), < 1 = уменьшить (больше времени видно)
   */
  function zoom(factor: number): void {
    zoomAt(factor, 0.5);
  }

  /**
   * Zoom anchored at a specific ratio across the viewport.
   * @param factor > 1 = zoom in, < 1 = zoom out
   * @param anchorRatio 0..1 position inside viewport (0 = left edge, 0.5 = center, 1 = right edge)
   */
  function zoomAt(factor: number, anchorRatio: number): void {
    const vp = viewportRef.current;
    const oldWindow = vp.timeEnd - vp.timeStart;
    const anchorTime = vp.timeStart + oldWindow * anchorRatio;
    const newWindowMs = oldWindow / factor;

    // Fix #7: After clamping window size, recompute start/end from the anchor
    // so the zoom feels anchored at the pointer position
    const clampedWindowMs = Math.max(MIN_WINDOW_MS, Math.min(MAX_WINDOW_MS, newWindowMs));
    let newTimeStart = anchorTime - clampedWindowMs * anchorRatio;
    let newTimeEnd = newTimeStart + clampedWindowMs;

    const bounds = dataBoundsRef.current;
    if (bounds) {
      const clamped = clampToDataBounds({
        timeStart: newTimeStart,
        timeEnd: newTimeEnd,
        dataTimeMin: bounds.timeMin,
        dataTimeMax: bounds.timeMax,
      });
      newTimeStart = clamped.timeStart;
      newTimeEnd = clamped.timeEnd;
    }

    // If window didn't change (hit zoom limit), don't update — avoids position jitter
    const actualNewWindow = newTimeEnd - newTimeStart;
    if (Math.abs(actualNewWindow - oldWindow) < 1) return;

    vp.timeStart = newTimeStart;
    vp.timeEnd = newTimeEnd;
    vp.autoFollow = false;
  }

  /**
   * Pan: сдвинуть окно влево/вправо
   * 🔥 FLOW PAN-CLAMP: Ограничено — минимум 10% viewport пересекается с данными
   * @param deltaMs положительное = вправо (будущее), отрицательное = влево (прошлое)
   */
  function pan(deltaMs: number): void {
    const vp = viewportRef.current;
    vp.autoFollow = false; // После pan отключаем auto-follow

    let newTimeStart = vp.timeStart + deltaMs;
    let newTimeEnd = vp.timeEnd + deltaMs;

    // 🔥 FLOW PAN-CLAMP: Ограничиваем pan по границам данных
    const bounds = dataBoundsRef.current;
    if (bounds) {
      const clamped = clampToDataBounds({
        timeStart: newTimeStart,
        timeEnd: newTimeEnd,
        dataTimeMin: bounds.timeMin,
        dataTimeMax: bounds.timeMax,
      });
      newTimeStart = clamped.timeStart;
      newTimeEnd = clamped.timeEnd;
    }

    vp.timeStart = newTimeStart;
    vp.timeEnd = newTimeEnd;
  }

  /**
   * Сбросить auto-follow (включить автоматическое следование)
   */
  function resetFollow(): void {
    viewportRef.current.autoFollow = true;
    scrollTargetEndRef.current = null;
    lastAdvancePerfRef.current = 0;
    lastSecondRef.current = 0;
  }

  /**
   * Установить auto-follow (включить/выключить автоматическое следование)
   */
  function setAutoFollow(enabled: boolean): void {
    viewportRef.current.autoFollow = enabled;
    if (!enabled) {
      scrollTargetEndRef.current = null;
    }
  }

  /**
   * Установить временное окно вручную
   */
  function setViewport(timeStart: number, timeEnd: number, autoFollow: boolean = false): void {
    viewportRef.current = {
      timeStart,
      timeEnd,
      autoFollow,
    };
    scrollTargetEndRef.current = null;
    lastAdvancePerfRef.current = 0;
    lastSecondRef.current = 0;
  }

  /**
   * FLOW LP-3: Установить временное окно (алиас для setViewport с autoFollow=false)
   */
  function setWindow(timeStart: number, timeEnd: number): void {
    setViewport(timeStart, timeEnd, false);
  }

  /**
   * Получить текущий viewport
   */
  function getViewport(): LineViewport {
    return viewportRef.current;
  }

  /**
   * Получить ширину временного окна в миллисекундах
   */
  function getWindowMs(): number {
    return viewportRef.current.timeEnd - viewportRef.current.timeStart;
  }

  /**
   * Обновить диапазон цен (вызывается извне при вычислении priceRange)
   */
  function updatePriceRange(min: number, max: number): void {
    priceRangeRef.current = { min, max };
  }

  /**
   * 🔥 FLOW PAN-CLAMP: Обновить границы данных (вызывается извне при изменении данных)
   * Используется для ограничения pan — viewport не может уехать за пределы данных
   */
  function setDataBounds(timeMin: number, timeMax: number): void {
    dataBoundsRef.current = { timeMin, timeMax };
  }

  /**
   * Получить TimePriceViewport для UI-рендеринга
   */
  function getTimePriceViewport(): TimePriceViewport | null {
    const vp = viewportRef.current;
    const priceRange = priceRangeRef.current;
    
    if (!priceRange) return null;
    
    return {
      timeStart: vp.timeStart,
      timeEnd: vp.timeEnd,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
    };
  }

  return {
    advanceContinuousFollow,
    calibrateTime,
    getWallTime,
    zoom,
    zoomAt,
    pan,
    resetFollow,
    setAutoFollow,
    setViewport,
    setWindow,
    getViewport,
    getWindowMs,
    updatePriceRange,
    getTimePriceViewport,
    setDataBounds, // 🔥 FLOW PAN-CLAMP
  };
}
