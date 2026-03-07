/**
 * renderCandles.ts - отрисовка свечей
 * 
 * FLOW G4: Render Engine
 * 
 * Performance: batch-рендеринг (один beginPath/stroke на цвет),
 * бинарный поиск видимых свечей, sub-pixel alignment.
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import type { CandleMode } from '../candleModes/candleMode.types';

interface RenderCandlesParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  candles: Candle[];
  liveCandle: Candle | null;
  width: number;
  height: number;
  timeframeMs: number;
  mode?: CandleMode;
  settings?: { bullishColor: string; bearishColor: string };
}

const WICK_WIDTH = 1;
const MAX_CANDLE_PX = 200;
const MIN_GAP_PX = 2;
const MAX_GAP_PX = 6;

function getBodyWidthRatio(candleWidth: number): number {
  if (candleWidth <= 0) return 0.7;
  const targetGap = Math.min(MAX_GAP_PX, Math.max(MIN_GAP_PX, candleWidth * 0.04));
  const ratio = (candleWidth - targetGap) / candleWidth;
  return Math.max(0.7, Math.min(0.96, ratio));
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

/**
 * Binary search: find first candle whose endTime >= target.
 * Candles must be sorted by startTime ascending.
 */
function lowerBound(candles: Candle[], target: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid].endTime < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Find last candle whose startTime <= target */
function upperBound(candles: Candle[], target: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid].startTime <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

interface CandleGeom {
  centerX: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  isGreen: boolean;
}

function computeGeom(
  candle: Candle,
  viewport: Viewport,
  width: number,
  height: number,
  timeframeMs: number,
): CandleGeom {
  const candleCenterTime = candle.startTime + timeframeMs / 2;
  return {
    centerX: timeToX(candleCenterTime, viewport, width),
    openY: priceToY(candle.open, viewport, height),
    closeY: priceToY(candle.close, viewport, height),
    highY: priceToY(candle.high, viewport, height),
    lowY: priceToY(candle.low, viewport, height),
    isGreen: candle.close >= candle.open,
  };
}

/**
 * Batch-render classic/heikin-ashi candles.
 * Groups all bullish and bearish wicks+bodies into two paths each,
 * drastically reducing Canvas API calls.
 */
function renderBatchClassic(
  ctx: CanvasRenderingContext2D,
  geoms: CandleGeom[],
  candleWidth: number,
  colors: { bullishColor: string; bearishColor: string },
): void {
  const wickWidth = candleWidth <= 2 ? Math.max(0.5, candleWidth / 2) : WICK_WIDTH;
  const bodyWidthRatio = getBodyWidthRatio(candleWidth);
  const bodyWidth = Math.max(0.5, candleWidth * bodyWidthRatio);
  const halfBody = bodyWidth / 2;
  const drawBody = candleWidth > 0.5;

  for (let pass = 0; pass < 2; pass++) {
    const isGreenPass = pass === 0;
    const color = isGreenPass ? colors.bullishColor : colors.bearishColor;

    // Wicks
    ctx.strokeStyle = color;
    ctx.lineWidth = wickWidth;
    ctx.beginPath();
    for (let i = 0; i < geoms.length; i++) {
      const g = geoms[i];
      if (g.isGreen !== isGreenPass) continue;
      const x = snap(g.centerX);
      ctx.moveTo(x, g.highY);
      ctx.lineTo(x, g.lowY);
    }
    ctx.stroke();

    // Bodies
    if (drawBody) {
      ctx.fillStyle = color;
      for (let i = 0; i < geoms.length; i++) {
        const g = geoms[i];
        if (g.isGreen !== isGreenPass) continue;
        const bodyTop = Math.min(g.openY, g.closeY);
        const bodyHeight = Math.abs(g.closeY - g.openY) || 1;
        ctx.fillRect(
          Math.round(g.centerX - halfBody),
          bodyTop,
          bodyWidth,
          bodyHeight,
        );
      }
    }
  }
}

/**
 * Batch-render OHLC bars.
 */
function renderBatchBars(
  ctx: CanvasRenderingContext2D,
  geoms: CandleGeom[],
  candleWidth: number,
  colors: { bullishColor: string; bearishColor: string },
): void {
  const barLineWidth = Math.min(4, Math.max(2, candleWidth * 0.4));
  const tickWidth = Math.max(4, candleWidth * 0.35);
  const halfTick = tickWidth / 2;

  for (let pass = 0; pass < 2; pass++) {
    const isGreenPass = pass === 0;
    const color = isGreenPass ? colors.bullishColor : colors.bearishColor;

    ctx.strokeStyle = color;
    ctx.lineWidth = barLineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let i = 0; i < geoms.length; i++) {
      const g = geoms[i];
      if (g.isGreen !== isGreenPass) continue;
      const x = snap(g.centerX);
      // Vertical high-low
      ctx.moveTo(x, g.highY);
      ctx.lineTo(x, g.lowY);
      // Open tick (left)
      ctx.moveTo(x - halfTick, g.openY);
      ctx.lineTo(x, g.openY);
      // Close tick (right)
      ctx.moveTo(x, g.closeY);
      ctx.lineTo(x + halfTick, g.closeY);
    }
    ctx.stroke();
  }
}

export function renderCandles({
  ctx,
  viewport,
  candles,
  liveCandle,
  width,
  height,
  timeframeMs,
  mode = 'classic',
  settings,
}: RenderCandlesParams): void {
  if (!settings) return;

  const timeRange = viewport.timeEnd - viewport.timeStart;
  const rawWidth = timeRange > 0 ? (timeframeMs / timeRange) * width : 0;
  const candleWidth = Math.min(MAX_CANDLE_PX, rawWidth);

  // Binary search for visible range instead of iterating all candles
  const startIdx = Math.max(0, lowerBound(candles, viewport.timeStart));
  const endIdx = Math.min(candles.length - 1, upperBound(candles, viewport.timeEnd));

  const geomCount = Math.max(0, endIdx - startIdx + 1) + (liveCandle ? 1 : 0);
  const geoms: CandleGeom[] = new Array(geomCount);
  let gi = 0;

  for (let i = startIdx; i <= endIdx; i++) {
    geoms[gi++] = computeGeom(candles[i], viewport, width, height, timeframeMs);
  }

  if (liveCandle) {
    const lt = liveCandle.startTime;
    if (
      (lt >= viewport.timeStart && lt <= viewport.timeEnd) ||
      (liveCandle.endTime >= viewport.timeStart && liveCandle.endTime <= viewport.timeEnd) ||
      (lt <= viewport.timeStart && liveCandle.endTime >= viewport.timeEnd)
    ) {
      geoms[gi++] = computeGeom(liveCandle, viewport, width, height, timeframeMs);
    }
  }

  const actualCount = gi;
  if (actualCount === 0) return;

  ctx.save();
  ctx.setLineDash([]);

  if (mode === 'bars') {
    renderBatchBars(ctx, geoms.length === actualCount ? geoms : geoms.slice(0, actualCount), candleWidth, settings);
  } else {
    renderBatchClassic(ctx, geoms.length === actualCount ? geoms : geoms.slice(0, actualCount), candleWidth, settings);
  }

  ctx.restore();
}
