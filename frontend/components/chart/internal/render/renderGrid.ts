/**
 * renderGrid.ts - отрисовка сетки графика
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import { getChartSettings } from '@/lib/chartSettings';
import { timeToX, priceToY, snap } from '../utils/coords';
import { calculateTimeLabelStep, calculatePriceStep } from '../utils/format';
import { GRID_COLOR, GRID_LINE_WIDTH, TIME_AXIS_HEIGHT } from '../chartTheme';

interface RenderGridParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  width: number;
  height: number;
  timeframeMs?: number;
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
    const timeStep = calculateTimeLabelStep(timeRange, width);
    // Используем ту же логику выравнивания что и в renderAxes
    const startTime = Math.ceil(viewport.timeStart / timeStep) * timeStep;

    ctx.beginPath();
    const gridHeight = height - TIME_AXIS_HEIGHT;
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
    const gridHeight = height - TIME_AXIS_HEIGHT;
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
 * Используется когда под графиком есть индикаторы - чтобы сетка шла и по зонам RSI/Stochastic/Momentum.
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

  const timeStep = calculateTimeLabelStep(timeRange, width);
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
