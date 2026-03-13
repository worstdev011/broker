/**
 * renderEngine.ts - оркестратор рендеринга
 * 
 * Ответственность:
 * - Координация всех render-функций
 * - Очистка canvas
 * - Последовательность отрисовки
 * 
 * FLOW G4: Render Engine
 * 
 * НЕ содержит математики viewport
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import { renderGrid } from './renderGrid';
import { renderCandles } from './renderCandles';
import { renderAxes } from './renderAxes';
import { renderPriceLine } from './renderPriceLine';

import type { CandleMode } from '../candleModes/candleMode.types';

interface RenderEngineParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  candles: Candle[];
  liveCandle: Candle | null;
  width: number;
  height: number;
  timeframeMs: number;
  mode?: CandleMode;
  digits?: number;
  settings?: { bullishColor: string; bearishColor: string };
}

export function renderEngine({
  ctx,
  viewport,
  candles,
  liveCandle,
  width,
  height,
  timeframeMs,
  mode = 'classic',
  digits,
  settings,
}: RenderEngineParams): void {
  renderGrid({ ctx, viewport, width, height, timeframeMs });
  renderCandles({ ctx, viewport, candles, liveCandle, width, height, timeframeMs, mode, settings });
  renderAxes({ ctx, viewport, width, height, digits });

  if (liveCandle) {
    renderPriceLine({ ctx, viewport, currentPrice: liveCandle.close, width, height, digits });
  }
}
