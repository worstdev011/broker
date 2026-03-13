/**
 * FLOW L-UI: Render Crosshair - унифицированный курсор
 * 
 * Используется и для свечного, и для линейного графика.
 * Работает только с mouse.x/y и viewport, без логики свечей.
 */

import type { TimePriceViewport } from './viewport.types';
import type { CrosshairState } from '../../crosshair/crosshair.types';
import type { InteractionZone } from '../../interactions/interaction.types';
import {
  CROSSHAIR_LINE_COLOR,
  CROSSHAIR_LABEL_BG,
  PRICE_LABEL_FONT,
  LABEL_BORDER_RADIUS,
  PRICE_LABEL_HEIGHT,
  PRICE_AXIS_WIDTH,
  TIME_AXIS_HEIGHT,
  LABEL_PADDING,
} from '../../chartTheme';

interface RenderCrosshairParams {
  ctx: CanvasRenderingContext2D;
  crosshair: CrosshairState | null;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  registerInteractionZone?: (zone: InteractionZone) => void;
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
 * Конвертирует X координату во время
 */
function xToTime(x: number, viewport: TimePriceViewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return viewport.timeStart;
  return viewport.timeStart + (x / width) * timeRange;
}

/**
 * Форматирует цену
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '—';
  return price.toFixed(digits ?? 2);
}

/**
 * Форматирует время
 */
function formatTime(ts: number): string {
  if (!Number.isFinite(ts)) return '--:--:--';
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

export function renderCrosshair({
  ctx,
  crosshair,
  viewport,
  width,
  height,
  registerInteractionZone,
  digits,
}: RenderCrosshairParams): void {
  if (!crosshair || !crosshair.isActive) {
    return;
  }

  ctx.save();

  const cx = Math.round(crosshair.x) + 0.5;
  const cy = Math.round(crosshair.y) + 0.5;

  ctx.strokeStyle = CROSSHAIR_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.stroke();

  const priceLabel = formatPrice(crosshair.price, digits);
  ctx.font = PRICE_LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const priceLabelCenterX = width - PRICE_AXIS_WIDTH / 2;
  const clampedY = Math.max(
    PRICE_LABEL_HEIGHT / 2,
    Math.min(crosshair.y, height - PRICE_LABEL_HEIGHT / 2)
  );
  const backgroundTop = clampedY - PRICE_LABEL_HEIGHT / 2;
  const backgroundCenter = backgroundTop + PRICE_LABEL_HEIGHT / 2;

  ctx.beginPath();
  ctx.fillStyle = CROSSHAIR_LABEL_BG;
  ctx.roundRect(
    width - PRICE_AXIS_WIDTH,
    backgroundTop,
    PRICE_AXIS_WIDTH,
    PRICE_LABEL_HEIGHT,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(priceLabel, priceLabelCenterX, backgroundCenter);

  if (registerInteractionZone) {
    const plusSize = PRICE_LABEL_HEIGHT - 4;
    const plusPadding = 6;
    const plusX = width - PRICE_AXIS_WIDTH - plusSize - plusPadding;
    const plusY = clampedY - plusSize / 2;

    ctx.fillStyle = CROSSHAIR_LABEL_BG;
    ctx.beginPath();
    ctx.roundRect(plusX, plusY, plusSize, plusSize, LABEL_BORDER_RADIUS);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const plusIconPadding = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plusX + plusSize / 2, plusY + plusIconPadding);
    ctx.lineTo(plusX + plusSize / 2, plusY + plusSize - plusIconPadding);
    ctx.moveTo(plusX + plusIconPadding, plusY + plusSize / 2);
    ctx.lineTo(plusX + plusSize - plusIconPadding, plusY + plusSize / 2);
    ctx.stroke();

    registerInteractionZone({
      type: 'add-alert',
      x: plusX,
      y: plusY,
      width: plusSize,
      height: plusSize,
      price: crosshair.price,
    });
  }

  ctx.restore();
}

/**
 * Рендерит метку времени внизу (отдельно, чтобы была поверх всего)
 */
export function renderCrosshairTimeLabel(
  ctx: CanvasRenderingContext2D,
  crosshair: CrosshairState | null,
  viewport: TimePriceViewport,
  width: number,
  height: number
): void {
  if (!crosshair?.isActive) return;

  const time = xToTime(crosshair.x, viewport, width);
  const text = formatTime(time);

  ctx.save();

  ctx.font = PRICE_LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width;
  const boxW = tw + LABEL_PADDING * 2;
  const boxH = PRICE_LABEL_HEIGHT;
  let x = crosshair.x - boxW / 2;
  x = Math.max(2, Math.min(x, width - boxW - 2));
  const y = height - boxH;

  ctx.fillStyle = CROSSHAIR_LABEL_BG;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, LABEL_BORDER_RADIUS);
  ctx.fill();

  const textX = x + boxW / 2;
  const textY = y + boxH / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, textX, textY);

  ctx.restore();
}
