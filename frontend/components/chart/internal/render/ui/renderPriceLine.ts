/**
 * FLOW L-UI: Render Price Line - линия текущей цены
 * 
 * Используется и для свечного, и для линейного графика.
 * Рисует линию и метку справа точно как в свечном графике.
 */

import type { TimePriceViewport } from './viewport.types';
import {
  PRICE_LINE_COLOR,
  PRICE_LINE_WIDTH,
  PRICE_LINE_DASH,
  PRICE_LABEL_FONT,
  PRICE_AXIS_WIDTH,
  PRICE_LABEL_HEIGHT,
  LABEL_BORDER_RADIUS,
  CROSSHAIR_LABEL_BG,
  TIME_AXIS_HEIGHT,
} from '../../chartTheme';

interface RenderPriceLineParams {
  ctx: CanvasRenderingContext2D;
  price: number;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту) */
  digits?: number;
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

/**
 * Форматирует цену: по digits инструмента или по величине (fallback).
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '-';
  if (digits != null) return price.toFixed(digits);
  const decimals = price >= 1000 ? 0 : price >= 100 ? 1 : price >= 10 ? 2 : 3;
  return price.toFixed(decimals);
}

export function renderPriceLine({
  ctx,
  price,
  viewport,
  width,
  height,
  digits,
}: RenderPriceLineParams): void {
  const y = priceToY(price, viewport, height);

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

  const label = formatPrice(price, digits);
  const bgColor = CROSSHAIR_LABEL_BG;

  ctx.font = PRICE_LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const clampedY = Math.max(
    PRICE_LABEL_HEIGHT / 2,
    Math.min(y, height - TIME_AXIS_HEIGHT - PRICE_LABEL_HEIGHT / 2)
  );
  const backgroundTop = clampedY - PRICE_LABEL_HEIGHT / 2;
  const backgroundCenter = backgroundTop + PRICE_LABEL_HEIGHT / 2;
  const labelCenterX = width - PRICE_AXIS_WIDTH / 2;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(
    width - PRICE_AXIS_WIDTH,
    backgroundTop,
    PRICE_AXIS_WIDTH,
    PRICE_LABEL_HEIGHT,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, labelCenterX, backgroundCenter);

  ctx.restore();
}
