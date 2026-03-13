/**
 * renderPriceLine.ts - отрисовка линии текущей цены
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import { priceToY } from '../utils/coords';
import { formatPrice } from '../utils/format';
import {
  PRICE_LINE_COLOR,
  PRICE_LINE_WIDTH,
  PRICE_LINE_DASH,
  PRICE_LABEL_FONT,
  LABEL_BORDER_RADIUS,
  PRICE_AXIS_WIDTH,
  PRICE_LABEL_HEIGHT,
  CROSSHAIR_LABEL_BG,
  TIME_AXIS_HEIGHT,
} from '../chartTheme';

interface RenderPriceLineParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  currentPrice: number;
  width: number;
  height: number;
  digits?: number;
}

export function renderPriceLine({
  ctx,
  viewport,
  currentPrice,
  width,
  height,
  digits,
}: RenderPriceLineParams): void {
  const y = priceToY(currentPrice, viewport, height);

  // Проверяем, что линия видна
  if (y < 0 || y > height) {
    return;
  }

  ctx.save();

  const maxX = width - PRICE_AXIS_WIDTH;
  const sy = Math.round(y) + 0.5;

  ctx.strokeStyle = PRICE_LINE_COLOR;
  ctx.lineWidth = PRICE_LINE_WIDTH;
  ctx.setLineDash(PRICE_LINE_DASH);
  ctx.beginPath();
  ctx.moveTo(0, sy);
  ctx.lineTo(maxX, sy);
  ctx.stroke();
  ctx.setLineDash([]);

  const label = formatPrice(currentPrice, digits);
  const bgColor = CROSSHAIR_LABEL_BG;

  ctx.font = PRICE_LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const clampedY = Math.max(PRICE_LABEL_HEIGHT / 2, Math.min(y, height - TIME_AXIS_HEIGHT - PRICE_LABEL_HEIGHT / 2));
  const clampedBackgroundTop = clampedY - PRICE_LABEL_HEIGHT / 2;
  const clampedBackgroundCenter = clampedBackgroundTop + PRICE_LABEL_HEIGHT / 2;
  const labelCenterX = width - PRICE_AXIS_WIDTH / 2;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(
    width - PRICE_AXIS_WIDTH,
    clampedBackgroundTop,
    PRICE_AXIS_WIDTH,
    PRICE_LABEL_HEIGHT,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, labelCenterX, clampedBackgroundCenter);

  ctx.restore();
}
