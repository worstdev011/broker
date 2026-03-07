/**
 * renderPriceLine.ts - отрисовка линии текущей цены
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';

interface RenderPriceLineParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  currentPrice: number;
  width: number;
  height: number;
  digits?: number;
  previousPrice?: number | null;
}

const PRICE_LINE_COLOR = 'rgba(64, 100, 143, 0.5)';
const PRICE_LINE_WIDTH = 1;
const LABEL_COLOR = '#ffffff';
const LABEL_BG_UP = '#26a69a';
const LABEL_BG_DOWN = '#ef5350';
const LABEL_BG_NEUTRAL = '#40648f';
const LABEL_FONT = '12px monospace'; // Шрифт как у кроссхейра
const LABEL_PADDING = 6;
const LABEL_BORDER_RADIUS = 6; // Скругление как у кроссхейра
const PRICE_LABEL_AREA_WIDTH = 60; // Ширина области меток цены
const PRICE_LABEL_HEIGHT = 26; // Высота метки как у кроссхейра

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

/**
 * Форматирует цену: по digits инструмента или по величине (fallback).
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '—';
  if (digits != null) return price.toFixed(digits);
  const decimals = price >= 1000 ? 0 : price >= 100 ? 1 : price >= 10 ? 2 : 3;
  return price.toFixed(decimals);
}

export function renderPriceLine({
  ctx,
  viewport,
  currentPrice,
  width,
  height,
  digits,
  previousPrice,
}: RenderPriceLineParams): void {
  const y = priceToY(currentPrice, viewport, height);

  // Проверяем, что линия видна
  if (y < 0 || y > height) {
    return;
  }

  ctx.save();

  // Ограничиваем линию, чтобы она не налазила на метки цены справа
  const TIME_LABEL_HEIGHT = 25; // Высота области меток времени
  const maxX = width - PRICE_LABEL_AREA_WIDTH;

  const sy = Math.round(y) + 0.5;

  ctx.strokeStyle = PRICE_LINE_COLOR;
  ctx.lineWidth = PRICE_LINE_WIDTH;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, sy);
  ctx.lineTo(maxX, sy);
  ctx.stroke();
  ctx.setLineDash([]);

  const isUp = previousPrice != null && currentPrice > previousPrice;
  const isDown = previousPrice != null && currentPrice < previousPrice;
  const arrow = isUp ? ' ▲' : isDown ? ' ▼' : '';
  const label = formatPrice(currentPrice, digits) + arrow;
  const bgColor = isUp ? LABEL_BG_UP : isDown ? LABEL_BG_DOWN : LABEL_BG_NEUTRAL;

  ctx.font = LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const labelX = width - PRICE_LABEL_AREA_WIDTH + LABEL_PADDING;

  const clampedY = Math.max(PRICE_LABEL_HEIGHT / 2, Math.min(y, height - TIME_LABEL_HEIGHT - PRICE_LABEL_HEIGHT / 2));
  const clampedBackgroundTop = clampedY - PRICE_LABEL_HEIGHT / 2;
  const clampedBackgroundCenter = clampedBackgroundTop + PRICE_LABEL_HEIGHT / 2;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(
    width - PRICE_LABEL_AREA_WIDTH,
    clampedBackgroundTop,
    PRICE_LABEL_AREA_WIDTH,
    PRICE_LABEL_HEIGHT,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(label, labelX, clampedBackgroundCenter);

  ctx.restore();
}
