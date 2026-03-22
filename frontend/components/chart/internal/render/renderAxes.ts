/**
 * renderAxes.ts - отрисовка осей графика
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import { timeToX, priceToY } from '../utils/coords';
import { formatPrice, formatTime, calculateTimeLabelStep, calculatePriceStep } from '../utils/format';
import {
  LABEL_COLOR,
  LABEL_FONT,
  TIME_LABEL_PADDING,
  TIME_AXIS_HEIGHT,
  TIME_AXIS_BG,
} from '../chartTheme';

interface RenderAxesParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту). Если задано - используется вместо авто-логики по величине цены. */
  digits?: number;
}

const PRICE_LABEL_OFFSET_ABOVE_GRID = 12;

export function renderAxes({
  ctx,
  viewport,
  width,
  height,
  digits,
}: RenderAxesParams): void {
  ctx.save();

  ctx.fillStyle = LABEL_COLOR;
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const timeRange = viewport.timeEnd - viewport.timeStart;
  const priceRange = viewport.priceMax - viewport.priceMin;

  if (timeRange > 0) {
    ctx.fillStyle = TIME_AXIS_BG;
    ctx.fillRect(0, height - TIME_AXIS_HEIGHT, width, TIME_AXIS_HEIGHT);

    const timeStep = calculateTimeLabelStep(timeRange, width);
    const startTime = Math.ceil(viewport.timeStart / timeStep) * timeStep;

    ctx.fillStyle = LABEL_COLOR;
    ctx.textBaseline = 'alphabetic';
    const MAX_AXIS_LABELS = 100;
    let labelCount = 0;
    for (let time = startTime; time <= viewport.timeEnd && labelCount < MAX_AXIS_LABELS; time += timeStep) {
      if (timeStep <= 0) break;
      labelCount++;
      const x = timeToX(time, viewport, width);
      if (x >= 0 && x <= width) {
        ctx.fillText(formatTime(time), x, height - TIME_LABEL_PADDING);
      }
    }
  }

  if (priceRange > 0) {
    const priceStep = calculatePriceStep(priceRange, height);
    const startPrice = Math.ceil(viewport.priceMin / priceStep) * priceStep;

    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const priceLabelRightX = width - 8;
    const MAX_AXIS_LABELS = 100;
    let labelCount = 0;
    for (let price = startPrice; price <= viewport.priceMax && labelCount < MAX_AXIS_LABELS; price += priceStep) {
      if (priceStep <= 0) break;
      labelCount++;
      const y = priceToY(price, viewport, height);
      if (y >= 0 && y <= height) {
        ctx.fillText(formatPrice(price, digits), priceLabelRightX, y - PRICE_LABEL_OFFSET_ABOVE_GRID);
      }
    }
  }

  ctx.restore();
}
