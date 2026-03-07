/**
 * FLOW LINE-4: Rendering линейного графика на Canvas
 * 
 * Ответственность:
 * - Отрисовка линии из тиков
 * - Преобразование (time, price) → (x, y)
 * - Binary search для видимых тиков
 * - FLOW L-UI-2: Area fill под линией с градиентом
 */

import type { PricePoint } from './useLinePointStore';
import type { LineViewport } from './lineTypes';

interface RenderLineParams {
  ctx: CanvasRenderingContext2D;
  ticks: PricePoint[];
  viewport: LineViewport;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  color?: string;
  lineWidth?: number;
  /** FLOW L-UI-2: Рендерить ли area fill под линией */
  renderAreaFill?: boolean;
  /** Live точка — добавляется в конец для area fill (градиент включает live) */
  livePoint?: { time: number; price: number } | null;
}

function priceToY(price: number, priceMin: number, priceMax: number, height: number): number {
  const priceRange = priceMax - priceMin;
  if (priceRange === 0) return height / 2;

  const normalizedPrice = (price - priceMin) / priceRange;
  return height - (normalizedPrice * height);
}

/** First index where ticks[i].time >= target */
function lowerBound(ticks: PricePoint[], target: number): number {
  let lo = 0;
  let hi = ticks.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ticks[mid].time < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** First index where ticks[i].time > target */
function upperBound(ticks: PricePoint[], target: number): number {
  let lo = 0;
  let hi = ticks.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ticks[mid].time <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function renderAreaFillPath(
  ctx: CanvasRenderingContext2D,
  ticks: PricePoint[],
  startIdx: number,
  endIdx: number,
  timeStart: number,
  invTimeRange: number,
  width: number,
  height: number,
  priceMin: number,
  priceMax: number,
  livePoint: { time: number; price: number } | null,
  liveTimeEnd: number
): void {
  if (startIdx >= endIdx && !livePoint) return;

  let minY = Infinity;
  let firstX = 0;
  let firstY = 0;
  let lastX = 0;
  let lastY = 0;

  ctx.beginPath();

  let pathStarted = false;
  for (let i = startIdx; i < endIdx; i++) {
    const tick = ticks[i];
    const x = (tick.time - timeStart) * invTimeRange * width;
    const y = priceToY(tick.price, priceMin, priceMax, height);
    if (!pathStarted) {
      ctx.moveTo(x, y);
      firstX = x;
      firstY = y;
      pathStarted = true;
    } else {
      ctx.lineTo(x, y);
    }
    lastX = x;
    lastY = y;
    if (y < minY) minY = y;
  }

  if (livePoint && livePoint.time >= timeStart && livePoint.time <= liveTimeEnd) {
    const lx = (livePoint.time - timeStart) * invTimeRange * width;
    const ly = priceToY(livePoint.price, priceMin, priceMax, height);
    if (!pathStarted) {
      ctx.moveTo(lx, ly);
      firstX = lx;
      firstY = ly;
      pathStarted = true;
    } else {
      ctx.lineTo(lx, ly);
    }
    lastX = lx;
    lastY = ly;
    if (ly < minY) minY = ly;
  }

  if (!pathStarted) return;

  ctx.lineTo(lastX, height);
  ctx.lineTo(firstX, height);
  ctx.closePath();

  const topY = Math.max(0, Math.min(minY, height));
  const gradient = ctx.createLinearGradient(0, topY, 0, height);
  gradient.addColorStop(0, 'rgba(59,130,246,0.35)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.02)');
  ctx.fillStyle = gradient;
  ctx.fill();
}

/**
 * Рендерит линейный график из тиков
 */
export function renderLine({
  ctx,
  ticks,
  viewport,
  width,
  height,
  priceMin,
  priceMax,
  color = '#4da3ff',
  lineWidth = 1.3,
  renderAreaFill: shouldRenderAreaFill = false,
  livePoint = null,
}: RenderLineParams): void {
  if (ticks.length === 0) return;

  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;
  if (timeRange <= 0) return;

  const startIdx = Math.max(0, lowerBound(ticks, timeStart) - 1);
  const endIdx = upperBound(ticks, timeEnd);

  if (startIdx >= endIdx) return;

  const invTimeRange = 1 / timeRange;

  ctx.save();

  if (shouldRenderAreaFill) {
    renderAreaFillPath(ctx, ticks, startIdx, endIdx, timeStart, invTimeRange, width, height, priceMin, priceMax, livePoint, timeEnd);
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const first = ticks[startIdx];
  ctx.moveTo((first.time - timeStart) * invTimeRange * width, priceToY(first.price, priceMin, priceMax, height));

  for (let i = startIdx + 1; i < endIdx; i++) {
    const tick = ticks[i];
    ctx.lineTo((tick.time - timeStart) * invTimeRange * width, priceToY(tick.price, priceMin, priceMax, height));
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Вычисляет min/max цену из тиков в viewport (binary search)
 * Учитывает live сегмент: fromPrice + toPrice
 */
export function calculatePriceRange(
  ticks: PricePoint[],
  viewport: LineViewport,
  liveSegment?: { fromPrice: number } | null,
  toPrice?: number
): { min: number; max: number } {
  const startIdx = lowerBound(ticks, viewport.timeStart);
  const endIdx = upperBound(ticks, viewport.timeEnd);

  let min = Infinity;
  let max = -Infinity;

  for (let i = startIdx; i < endIdx; i++) {
    const p = ticks[i].price;
    if (p < min) min = p;
    if (p > max) max = p;
  }

  if (liveSegment) {
    const fp = liveSegment.fromPrice;
    if (fp < min) min = fp;
    if (fp > max) max = fp;
    if (toPrice !== undefined && Number.isFinite(toPrice)) {
      if (toPrice < min) min = toPrice;
      if (toPrice > max) max = toPrice;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }

  const padding = (max - min) * 0.1 || 1;
  return {
    min: min - padding,
    max: max + padding,
  };
}

/**
 * Рендерит live сегмент — линия от (fromTime, fromPrice) к (toTime, toPrice).
 */
export function renderLiveSegment({
  ctx,
  fromTime,
  toTime,
  fromPrice,
  toPrice,
  viewport,
  width,
  height,
  priceMin,
  priceMax,
  color = '#4da3ff',
  lineWidth = 1.3,
  renderAreaFill: shouldRenderAreaFill = false,
}: {
  ctx: CanvasRenderingContext2D;
  fromTime: number;
  toTime: number;
  fromPrice: number;
  toPrice: number;
  viewport: LineViewport;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  color?: string;
  lineWidth?: number;
  renderAreaFill?: boolean;
}): void {
  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;
  if (timeRange <= 0) return;

  ctx.save();

  const invTimeRange = 1 / timeRange;
  const fromX = (fromTime - timeStart) * invTimeRange * width;
  const toX = (toTime - timeStart) * invTimeRange * width;
  const fromY = priceToY(fromPrice, priceMin, priceMax, height);
  const toY = priceToY(toPrice, priceMin, priceMax, height);

  if (shouldRenderAreaFill) {
    const minY = Math.min(fromY, toY);
    const topY = Math.max(0, Math.min(minY, height));

    const gradient = ctx.createLinearGradient(0, topY, 0, height);
    gradient.addColorStop(0, 'rgba(59,130,246,0.35)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.02)');

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX, height);
    ctx.lineTo(fromX, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.restore();
}
