/**
 * renderGrid.ts - отрисовка сетки графика
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import { getChartSettings } from '@/lib/chartSettings';

interface RenderGridParams {
  ctx: CanvasRenderingContext2D; // Нативный тип браузера
  viewport: Viewport;
  width: number;
  height: number;
  timeframeMs?: number; // Для привязки вертикальных линий к границам свечей
}

const GRID_COLOR = 'rgba(255, 255, 255, 0.07)';
const GRID_LINE_WIDTH = 1;
const TIME_LABEL_HEIGHT = 25; // Высота области для меток времени (чтобы сетка не налазила)

/**
 * Вычисляет оптимальный шаг для сетки по времени
 * Использует ту же логику что и renderAxes для синхронизации с метками времени
 */
function calculateTimeStep(timeRange: number, width: number, timeframeMs?: number): number {
  const MIN_LABEL_SPACING = 60; // Минимальное расстояние между метками в пикселях (как в renderAxes)
  const targetLabels = Math.floor(width / MIN_LABEL_SPACING);
  
  if (targetLabels <= 0) return timeRange;
  
  const timePerLabel = timeRange / targetLabels;
  
  // Используем ту же логику что и в renderAxes для синхронизации
  if (timePerLabel < 1000) {
    // Меньше секунды - округляем до секунд
    return Math.ceil(timePerLabel / 1000) * 1000;
  } else if (timePerLabel < 60000) {
    // Меньше минуты - округляем до секунд (5s, 10s, 30s)
    const seconds = Math.ceil(timePerLabel / 1000);
    if (seconds <= 5) return 5000;
    if (seconds <= 10) return 10000;
    if (seconds <= 30) return 30000;
    return 60000;
  } else {
    // Минуты или больше
    const minutes = Math.ceil(timePerLabel / 60000);
    return minutes * 60000;
  }
}

/**
 * Вычисляет оптимальный шаг для сетки по цене
 */
function calculatePriceStep(priceRange: number, height: number): number {
  if (height <= 0 || priceRange <= 0) return priceRange || 1;

  const targetSteps = 10;
  const pixelsPerStep = height / targetSteps;
  const pricePerPixel = priceRange / height;
  const priceStep = pixelsPerStep * pricePerPixel;

  if (!Number.isFinite(priceStep) || priceStep <= 0) return priceRange || 1;

  const magnitude = Math.pow(10, Math.floor(Math.log10(priceStep)));
  if (!Number.isFinite(magnitude) || magnitude <= 0) return priceRange || 1;

  const normalized = priceStep / magnitude;

  let step: number;
  if (normalized <= 1) step = 1;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 5) step = 5;
  else step = 10;

  return step * magnitude;
}

/** Sub-pixel aligned coordinate for crisp 1px lines */
function snap(v: number): number {
  return Math.round(v) + 0.5;
}

function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

export function renderGrid({
  ctx,
  viewport,
  width,
  height,
  timeframeMs,
}: RenderGridParams): void {
  const settings = getChartSettings();
  
  // Если сетка отключена, не рисуем ничего
  if (!settings.showGrid) {
    return;
  }
  
  ctx.save();

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = GRID_LINE_WIDTH;

  const timeRange = viewport.timeEnd - viewport.timeStart;
  const priceRange = viewport.priceMax - viewport.priceMin;

  // Вертикальная сетка (по времени) - синхронизирована с метками времени из renderAxes
  if (timeRange > 0) {
    const timeStep = calculateTimeStep(timeRange, width, timeframeMs);
    // Используем ту же логику выравнивания что и в renderAxes
    const startTime = Math.ceil(viewport.timeStart / timeStep) * timeStep;

    ctx.beginPath();
    const gridHeight = height - TIME_LABEL_HEIGHT;
    const MAX_GRID_LINES = 500;
    let lineCount = 0;
    for (let time = startTime; time <= viewport.timeEnd && lineCount < MAX_GRID_LINES; time += timeStep) {
      if (timeStep <= 0) break;
      lineCount++;
      const x = snap(timeToX(time, viewport, width));
      if (x >= 0 && x <= width) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gridHeight);
      }
    }
    ctx.stroke();
  }

  // Горизонтальная сетка (по цене)
  if (priceRange > 0) {
    const priceStep = calculatePriceStep(priceRange, height);
    const startPrice = Math.ceil(viewport.priceMin / priceStep) * priceStep;

    ctx.beginPath();
    const gridHeight = height - TIME_LABEL_HEIGHT;
    const MAX_GRID_LINES = 500;
    let lineCount = 0;
    for (let price = startPrice; price <= viewport.priceMax && lineCount < MAX_GRID_LINES; price += priceStep) {
      if (priceStep <= 0) break;
      lineCount++;
      const y = snap(priceToY(price, viewport, height));
      if (y >= 0 && y <= gridHeight) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Рисует только вертикальные линии сетки по времени в заданном диапазоне по Y.
 * Используется когда под графиком есть индикаторы — чтобы сетка шла и по зонам RSI/Stochastic/Momentum.
 */
export function renderVerticalGridOnly({
  ctx,
  viewport,
  width,
  fromY,
  toY,
  timeframeMs,
}: {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  width: number;
  fromY: number;
  toY: number;
  timeframeMs?: number;
}): void {
  const settings = getChartSettings();
  if (!settings.showGrid) return;

  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange <= 0) return;

  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = GRID_LINE_WIDTH;

  const timeStep = calculateTimeStep(timeRange, width, timeframeMs);
  const startTime = Math.ceil(viewport.timeStart / timeStep) * timeStep;

  ctx.beginPath();
  const MAX_GRID_LINES = 500;
  let lineCount = 0;
  for (let time = startTime; time <= viewport.timeEnd && lineCount < MAX_GRID_LINES; time += timeStep) {
    if (timeStep <= 0) break;
    lineCount++;
    const x = snap(timeToX(time, viewport, width));
    if (x >= 0 && x <= width) {
      ctx.moveTo(x, fromY);
      ctx.lineTo(x, toY);
    }
  }
  ctx.stroke();
  ctx.restore();
}
