/**
 * renderPriceAlerts.ts - отрисовка ценовых алертов
 *
 * FLOW A4: Alert Lines Render Layer
 *
 * Ответственность:
 * - Рисовать горизонтальные линии алертов
 * - НЕ содержать бизнес-логики (только draw)
 */

import type { PriceAlert } from './priceAlerts.types';
import type { Viewport } from '../viewport.types';

interface RenderPriceAlertsParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  width: number;
  height: number; // высота основной области графика (без RSI)
  alerts: PriceAlert[];
}

const ALERT_COLOR_ACTIVE = '#40648f'; // Цвет как у фона плюсика (LABEL_BG_COLOR)
const ALERT_LINE_WIDTH = 1;
const ALERT_DASH: number[] = [4, 4]; // Пунктир

/**
 * Конвертирует цену в Y-координату в пределах основной области графика
 */
function mapPriceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;

  const t = (viewport.priceMax - price) / priceRange;
  return t * height;
}

export function renderPriceAlerts({
  ctx,
  viewport,
  width,
  height,
  alerts,
}: RenderPriceAlertsParams): void {
  if (!alerts.length) return;

  ctx.save();
  ctx.lineWidth = ALERT_LINE_WIDTH;
  ctx.setLineDash(ALERT_DASH);

  for (const alert of alerts) {
    // FLOW A6: не рисуем уже сработавшие алерты — линия исчезает
    if (alert.triggered) {
      continue;
    }

    const y = Math.round(mapPriceToY(alert.price, viewport, height)) + 0.5;

    ctx.beginPath();
    ctx.strokeStyle = ALERT_COLOR_ACTIVE;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

