/**
 * FLOW L-UI-2: Render Price Axis - метки цены справа
 * 
 * Используется для линейного графика.
 * Оси - это UI, не часть графика.
 */

import type { TimePriceViewport } from './viewport.types';
import { LABEL_COLOR, LABEL_FONT } from '../../chartTheme';

interface RenderPriceAxisParams {
  ctx: CanvasRenderingContext2D;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту) */
  digits?: number;
}

const LABEL_PADDING_RIGHT = 4;
const PRICE_LABEL_OFFSET_ABOVE_GRID = 12;

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
 * Форматирует цену
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '-';
  if (digits != null) return price.toFixed(digits);
  const decimals = price >= 1000 ? 0 : price >= 100 ? 1 : price >= 10 ? 2 : 3;
  return price.toFixed(decimals);
}


export function renderPriceAxis({
  ctx,
  viewport,
  width,
  height,
  digits,
}: RenderPriceAxisParams): void {
  const { priceMin, priceMax } = viewport;
  const priceRange = priceMax - priceMin;

  if (priceRange <= 0 || height <= 0) return;

  ctx.save();

  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const targetSteps = 10;
  const pixelsPerStep = height / targetSteps;
  const pricePerPixel = priceRange / height;
  const priceStepRaw = pixelsPerStep * pricePerPixel;

  if (!Number.isFinite(priceStepRaw) || priceStepRaw <= 0) {
    ctx.restore();
    return;
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(priceStepRaw)));
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    ctx.restore();
    return;
  }

  const normalized = priceStepRaw / magnitude;

  let priceStep: number;
  if (normalized <= 1) priceStep = 1;
  else if (normalized <= 2) priceStep = 2;
  else if (normalized <= 5) priceStep = 5;
  else priceStep = 10;

  priceStep = priceStep * magnitude;
  if (priceStep <= 0) { ctx.restore(); return; }
  const startPrice = Math.ceil(priceMin / priceStep) * priceStep;

  // Рисуем метки цены (БЕЗ горизонтальных линий - они уже нарисованы в renderGrid)
  let pCount = 0;
  for (let price = startPrice; price <= priceMax && pCount < 200; price += priceStep, pCount++) {
    const y = priceToY(price, viewport, height);

    if (y < 0 || y > height) continue;

    const priceText = formatPrice(price, digits);
    ctx.fillText(priceText, width - LABEL_PADDING_RIGHT, y - PRICE_LABEL_OFFSET_ABOVE_GRID);
  }

  ctx.restore();
}
