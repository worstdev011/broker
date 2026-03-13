/**
 * Rendering линейного графика на Canvas.
 *
 * Step-line interpolation (horizontal → vertical) matching the competitor.
 * Each tick draws a flat line at the previous price, then a vertical jump
 * to the new price — producing the characteristic "staircase" shape.
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
  renderAreaFill?: boolean;
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

// ─── Step-line path helper ──────────────────────────────────────────

/**
 * Step-diagonal hybrid: flat at previous price for most of the interval,
 * then a short diagonal ramp to the new price. This produces the
 * characteristic shape seen on competitor charts — mostly flat with
 * quick angled transitions instead of pure vertical jumps.
 *
 * TRANSITION_RATIO controls how much of the interval is the diagonal
 * ramp (0.3 = last 30% of the gap is the transition).
 */
const TRANSITION_RATIO = 0.3;

function traceStepPath(
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
) {
  const count = endIdx - startIdx;

  let firstX = 0;
  let firstY = 0;
  let lastX = 0;
  let lastY = 0;
  let minY = Infinity;
  let started = false;

  for (let i = 0; i < count; i++) {
    const tick = ticks[startIdx + i];
    const x = (tick.time - timeStart) * invTimeRange * width;
    const y = priceToY(tick.price, priceMin, priceMax, height);

    if (y < minY) minY = y;

    if (!started) {
      ctx.moveTo(x, y);
      firstX = x;
      firstY = y;
      started = true;
    } else {
      const gap = x - lastX;
      if (Math.abs(y - lastY) < 0.3 || gap < 2) {
        ctx.lineTo(x, y);
      } else {
        // Flat portion at previous price, then diagonal ramp to new price
        const rampStart = x - gap * TRANSITION_RATIO;
        ctx.lineTo(rampStart, lastY);
        ctx.lineTo(x, y);
      }
    }
    lastX = x;
    lastY = y;
  }

  // Live extension: horizontal at last price, then diagonal to animated price
  if (livePoint && livePoint.time >= timeStart) {
    const rawX = (livePoint.time - timeStart) * invTimeRange * width;
    const lx = Math.min(rawX, width);
    const ly = priceToY(livePoint.price, priceMin, priceMax, height);
    if (!started) {
      ctx.moveTo(lx, ly);
      firstX = lx;
      firstY = ly;
      started = true;
    } else {
      const gap = lx - lastX;
      if (Math.abs(ly - lastY) < 0.3 || gap < 2) {
        ctx.lineTo(lx, ly);
      } else {
        const rampStart = lx - gap * TRANSITION_RATIO;
        ctx.lineTo(rampStart, lastY);
        ctx.lineTo(lx, ly);
      }
    }
    lastX = lx;
    lastY = ly;
    if (ly < minY) minY = ly;
  }

  return { firstX, firstY, lastX, lastY, minY, started };
}

// ─── Area fill ─────────────────────────────────────────────────────

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
): void {
  if (startIdx >= endIdx && !livePoint) return;

  ctx.beginPath();
  const { firstX, lastX, minY, started } = traceStepPath(
    ctx, ticks, startIdx, endIdx, timeStart, invTimeRange,
    width, height, priceMin, priceMax, livePoint,
  );

  if (!started) return;

  ctx.lineTo(lastX, height);
  ctx.lineTo(firstX, height);
  ctx.closePath();

  const topY = Math.max(0, Math.min(minY, height));
  const gradient = ctx.createLinearGradient(0, topY, 0, height);
  gradient.addColorStop(0, 'rgba(59,130,246,0.45)');
  gradient.addColorStop(0.5, 'rgba(59,130,246,0.18)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.02)');
  ctx.fillStyle = gradient;
  ctx.fill();
}

// ─── Main line ─────────────────────────────────────────────────────

export function renderLine({
  ctx,
  ticks,
  viewport,
  width,
  height,
  priceMin,
  priceMax,
  color = '#4da3ff',
  lineWidth = 1.5,
  renderAreaFill: shouldRenderAreaFill = false,
  livePoint = null,
}: RenderLineParams): { x: number; y: number } | null {
  if (ticks.length === 0 && !livePoint) return null;

  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;
  if (timeRange <= 0) return null;

  const startIdx = ticks.length > 0 ? Math.max(0, lowerBound(ticks, timeStart) - 1) : 0;
  const endIdx = ticks.length > 0 ? upperBound(ticks, timeEnd) : 0;

  if (startIdx >= endIdx && !livePoint) return null;

  const invTimeRange = 1 / timeRange;

  ctx.save();

  if (shouldRenderAreaFill) {
    renderAreaFillPath(
      ctx, ticks, startIdx, endIdx, timeStart, invTimeRange,
      width, height, priceMin, priceMax, livePoint,
    );
  }

  // Glow layer: soft wide shadow behind the main line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth + 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.15;

  traceStepPath(
    ctx, ticks, startIdx, endIdx, timeStart, invTimeRange,
    width, height, priceMin, priceMax, livePoint,
  );
  ctx.stroke();

  // Main crisp line
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const { lastX, lastY } = traceStepPath(
    ctx, ticks, startIdx, endIdx, timeStart, invTimeRange,
    width, height, priceMin, priceMax, livePoint,
  );

  ctx.stroke();
  ctx.restore();

  return { x: lastX, y: lastY };
}

// ─── Price range calculation ───────────────────────────────────────

export function calculatePriceRange(
  ticks: PricePoint[],
  viewport: LineViewport,
  liveSegment?: { fromPrice: number } | null,
  toPrice?: number,
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

