/**
 * math.ts - чистая математика для pan/zoom
 * 
 * БЕЗ REACT, БЕЗ SIDE-EFFECTS
 * Только вычисления
 * 
 * FLOW G5: Interactions math
 */

import type { Viewport } from '../viewport.types';

interface PanViewportTimeParams {
  viewport: Viewport;
  deltaX: number;
  pixelsPerMs: number;
}

interface ZoomViewportTimeParams {
  viewport: Viewport;
  zoomFactor: number;
  anchorTime: number;
  minVisibleCandles: number;
  maxVisibleCandles: number;
  timeframeMs: number;
}

/**
 * Смещает viewport по времени (pan)
 * 
 * @returns НОВЫЙ viewport (не мутирует входные данные)
 */
export function panViewportTime({
  viewport,
  deltaX,
  pixelsPerMs,
}: PanViewportTimeParams): Viewport {
  // Конвертируем deltaX в миллисекунды
  const deltaTime = deltaX / pixelsPerMs;

  // Вычисляем новый диапазон времени
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeStart = viewport.timeStart - deltaTime;
  const newTimeEnd = newTimeStart + timeRange;

  // Инвариант: timeStart < timeEnd
  if (newTimeStart >= newTimeEnd) {
    // Если нарушен инвариант, возвращаем исходный viewport
    return { ...viewport };
  }

  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}

// ==========================================
// 🔥 FLOW PAN-CLAMP: Ограничение viewport по данным
// ==========================================

interface ClampToDataBoundsParams {
  timeStart: number;
  timeEnd: number;
  dataTimeMin: number;
  dataTimeMax: number;
  /** Минимальная доля viewport, которая должна пересекаться с данными (0..1). Default: 0.1 (10%) */
  overlapRatio?: number;
}

interface ClampResult {
  timeStart: number;
  timeEnd: number;
  /** true если viewport был clamped (достиг границы) */
  clamped: boolean;
}

/**
 * Ограничивает viewport так, чтобы хотя бы overlapRatio (10%) ширины viewport
 * пересекалось с диапазоном данных [dataTimeMin, dataTimeMax].
 * 
 * Предотвращает "уезжание" графика за пределы видимости.
 * 
 * Чистая функция, БЕЗ side-effects.
 */
export function clampToDataBounds({
  timeStart,
  timeEnd,
  dataTimeMin,
  dataTimeMax,
  overlapRatio = 0.1,
}: ClampToDataBoundsParams): ClampResult {
  const viewportWidth = timeEnd - timeStart;
  const margin = viewportWidth * overlapRatio;

  let clampedStart = timeStart;
  let clampedEnd = timeEnd;
  let clamped = false;

  // Не дать viewport уехать слишком далеко вправо (в будущее)
  // timeStart не должен быть больше, чем dataTimeMax - margin
  if (clampedStart > dataTimeMax - margin) {
    clampedStart = dataTimeMax - margin;
    clampedEnd = clampedStart + viewportWidth;
    clamped = true;
  }

  // Не дать viewport уехать слишком далеко влево (в прошлое)
  // timeEnd не должен быть меньше, чем dataTimeMin + margin
  if (clampedEnd < dataTimeMin + margin) {
    clampedEnd = dataTimeMin + margin;
    clampedStart = clampedEnd - viewportWidth;
    clamped = true;
  }

  return { timeStart: clampedStart, timeEnd: clampedEnd, clamped };
}

/**
 * Масштабирует viewport по времени (zoom)
 * 
 * @returns НОВЫЙ viewport (не мутирует входные данные)
 */
export function zoomViewportTime({
  viewport,
  zoomFactor,
  anchorTime,
  minVisibleCandles,
  maxVisibleCandles,
  timeframeMs,
}: ZoomViewportTimeParams): Viewport {
  const currentTimeRange = viewport.timeEnd - viewport.timeStart;
  if (currentTimeRange <= 0) return { ...viewport };

  const newTimeRange = currentTimeRange * zoomFactor;

  // Ограничиваем диапазон
  const minTimeRange = minVisibleCandles * timeframeMs;
  const maxTimeRange = maxVisibleCandles * timeframeMs;
  const clampedTimeRange = Math.max(minTimeRange, Math.min(maxTimeRange, newTimeRange));

  // Вычисляем позицию якоря относительно текущего viewport
  const anchorRatio = (anchorTime - viewport.timeStart) / currentTimeRange;

  // Вычисляем новый диапазон относительно якоря
  const newTimeStart = anchorTime - clampedTimeRange * anchorRatio;
  const newTimeEnd = newTimeStart + clampedTimeRange;

  // Инвариант: timeStart < timeEnd
  if (newTimeStart >= newTimeEnd) {
    // Если нарушен инвариант, возвращаем исходный viewport
    return { ...viewport };
  }

  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}
