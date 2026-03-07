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

  // Step-based scrolling: viewport сдвигается раз в ~1 секунду с плавным easing
  const SCROLL_STEP_MS = 1000;
  const SCROLL_SMOOTH_TAU = 250; // τ для экспоненциального easing (ms)
  const lastAdvancePerfRef = useRef<number>(0);

  /**
   * 🔥 FLOW CONTINUOUS-FOLLOW: Вычислить текущее wall time из performance.now()
   * Монотонное и плавное — один источник времени для viewport и live-сегмента
   */
  function getWallTime(perfNow: number): number {
    const anchor = timeAnchorRef.current;
    return anchor.wallTime + (perfNow - anchor.perfTime);
  }

  /**
   * 🔥 FLOW CONTINUOUS-FOLLOW: Калибровка якоря по серверному timestamp
   * Вызывается при получении price:update — корректирует drift клиент/сервер
   */
  function calibrateTime(serverTimestamp: number): void {
    const perfNow = performance.now();
    const currentEstimate = getWallTime(perfNow);
    const error = serverTimestamp - currentEstimate;

    // Корректируем только если drift > 50ms (игнорируем шум сети)
    if (Math.abs(error) > 50) {
      // Плавная коррекция: 30% от ошибки за раз (не прыжок)
      timeAnchorRef.current = {
        wallTime: timeAnchorRef.current.wallTime + error * 0.3,
        perfTime: timeAnchorRef.current.perfTime,
      };
    }
  }

  /**
   * Step-based viewport scrolling (Pocket Option style).
   *
   * Target позиция обновляется раз в SCROLL_STEP_MS (1 с).
   * Каждый кадр viewport плавно подтягивается к target через exponential easing.
   * Между шагами — chart практически неподвижен, движется только live-линия.
   */
  function advanceContinuousFollow(perfNow: number): void {
    if (!viewportRef.current.autoFollow) return;

    const vp = viewportRef.current;
    const windowMs = vp.timeEnd - vp.timeStart;
    const rightPadding = windowMs * RIGHT_PADDING_RATIO;
    const wallNow = getWallTime(perfNow);

    // Target: следующая граница секунды + right padding
    const targetEnd =
      (Math.floor(wallNow / SCROLL_STEP_MS) + 1) * SCROLL_STEP_MS + rightPadding;

    // Framerate-independent smooth easing
    const dt =
      lastAdvancePerfRef.current > 0
        ? Math.min(perfNow - lastAdvancePerfRef.current, 100)
        : 16;
    lastAdvancePerfRef.current = perfNow;

    const alpha = 1 - Math.exp(-dt / SCROLL_SMOOTH_TAU);
    vp.timeEnd += (targetEnd - vp.timeEnd) * alpha;
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
    let newWindowMs = oldWindow / factor;

    newWindowMs = Math.max(MIN_WINDOW_MS, Math.min(MAX_WINDOW_MS, newWindowMs));

    let newTimeStart = anchorTime - newWindowMs * anchorRatio;
    let newTimeEnd = newTimeStart + newWindowMs;

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
  }

  /**
   * Установить auto-follow (включить/выключить автоматическое следование)
   */
  function setAutoFollow(enabled: boolean): void {
    viewportRef.current.autoFollow = enabled;
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
