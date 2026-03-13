/**
 * FLOW L-UI: Render Grid - унифицированная сетка для всех типов графиков
 * 
 * Используется и для свечного, и для линейного графика.
 * Сетка считается ТОЛЬКО от viewport.timeStart/timeEnd и priceMin/priceMax.
 */

import type { TimePriceViewport } from './viewport.types';
import { getChartSettings } from '@/lib/chartSettings';
import { GRID_COLOR, GRID_LINE_WIDTH, TIME_AXIS_HEIGHT } from '../../chartTheme';

interface RenderGridParams {
  ctx: CanvasRenderingContext2D;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  /** Опциональный timeframeMs для свечного графика (для вертикальных линий) */
  timeframeMs?: number;
}

/**
 * Конвертирует время в X координату
 */
function timeToX(time: number, viewport: TimePriceViewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, viewport: TimePriceViewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  
  const normalizedPrice = (price - viewport.priceMin) / priceRange;
  return height - (normalizedPrice * height);
}

export function renderGrid({
  ctx,
  viewport,
  width,
  height,
  timeframeMs,
}: RenderGridParams): void {
  const settings = getChartSettings();
  if (!settings.showGrid) return;

  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = GRID_LINE_WIDTH;

  const { timeStart, timeEnd, priceMin, priceMax } = viewport;
  const timeRange = timeEnd - timeStart;
  const priceRange = priceMax - priceMin;

  if (timeRange <= 0 || priceRange <= 0) {
    ctx.restore();
    return;
  }

  const gridHeight = height - TIME_AXIS_HEIGHT;

  // Вертикальные линии (время)
  if (timeRange > 0) {
    const MIN_LABEL_SPACING = 60;
    const targetLabels = Math.floor(width / MIN_LABEL_SPACING);
    
    let timeStep: number;
    if (targetLabels <= 0) {
      timeStep = timeRange;
    } else {
      const timePerLabel = timeRange / targetLabels;
      
      if (timePerLabel < 1000) {
        timeStep = Math.ceil(timePerLabel / 1000) * 1000;
      } else if (timePerLabel < 60000) {
        const seconds = Math.ceil(timePerLabel / 1000);
        if (seconds <= 5) timeStep = 5000;
        else if (seconds <= 10) timeStep = 10000;
        else if (seconds <= 30) timeStep = 30000;
        else timeStep = 60000;
      } else {
        const minutes = Math.ceil(timePerLabel / 60000);
        timeStep = minutes * 60000;
      }
    }
    
    if (timeframeMs && timeframeMs > 0) {
      timeStep = Math.max(timeStep, timeframeMs);
    }
    
    const startTime = Math.ceil(timeStart / timeStep) * timeStep;
    
    ctx.beginPath();
    let vCount = 0;
    for (let time = startTime; time <= timeEnd && vCount < 200; time += timeStep, vCount++) {
      const rx = Math.round(timeToX(time, viewport, width)) + 0.5;
      if (rx >= 0 && rx <= width) {
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx, gridHeight);
      }
    }
    ctx.stroke();
  }

  // Горизонтальные линии (цена)
  if (priceRange > 0) {
    const targetSteps = 10;
    const pixelsPerStep = height / targetSteps;
    const pricePerPixel = priceRange / height;
    const priceStepRaw = pixelsPerStep * pricePerPixel;

    const magnitude = Math.pow(10, Math.floor(Math.log10(priceStepRaw)));
    const normalized = priceStepRaw / magnitude;

    let priceStep: number;
    if (normalized <= 1) priceStep = 1;
    else if (normalized <= 2) priceStep = 2;
    else if (normalized <= 5) priceStep = 5;
    else priceStep = 10;

    priceStep = priceStep * magnitude;
    const startPrice = Math.ceil(priceMin / priceStep) * priceStep;
    
    ctx.beginPath();
    let hCount = 0;
    for (let price = startPrice; price <= priceMax && hCount < 200; price += priceStep, hCount++) {
      const ry = Math.round(priceToY(price, viewport, height)) + 0.5;
      if (ry >= 0 && ry <= gridHeight) {
        ctx.moveTo(0, ry);
        ctx.lineTo(width, ry);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}
