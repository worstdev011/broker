/**
 * renderCrosshair.ts - отрисовка crosshair
 * 
 * FLOW G7: Crosshair rendering
 */

import type { CrosshairState } from './crosshair.types';
import type { InteractionZone } from '../interactions/interaction.types';
import {
  CROSSHAIR_LINE_COLOR,
  CROSSHAIR_LABEL_BG,
  PRICE_LABEL_FONT,
  LABEL_BORDER_RADIUS,
  LABEL_PADDING,
  PRICE_LABEL_HEIGHT,
  PRICE_AXIS_WIDTH,
} from '../chartTheme';

interface RenderCrosshairParams {
  ctx: CanvasRenderingContext2D;
  crosshair: CrosshairState | null;
  width: number;
  height: number;
  registerInteractionZone?: (zone: InteractionZone) => void;
  /** Количество знаков после запятой для цен (по инструменту). */
  digits?: number;
}

/** Время под курсором: viewport отдаёт ms, Date(ms) → HH:mm:ss */
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

/**
 * Форматирует цену: по digits инструмента или 2 по умолчанию.
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '—';
  return price.toFixed(digits ?? 2);
}

/**
 * Рисует только метку времени внизу (время под курсором).
 * Вызывается последней в кадре, чтобы ничего не перекрывало текст.
 */
export function renderCrosshairTimeLabel(
  ctx: CanvasRenderingContext2D,
  crosshair: CrosshairState | null,
  width: number,
  height: number
): void {
  if (!crosshair?.isActive) return;

  const text = formatTime(crosshair.time);
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

export function renderCrosshair({
  ctx,
  crosshair,
  width,
  height,
  registerInteractionZone,
  digits,
}: RenderCrosshairParams): void {
  if (!crosshair || !crosshair.isActive) {
    return;
  }

  ctx.save();

  const sx = Math.round(crosshair.x) + 0.5;
  const sy = Math.round(crosshair.y) + 0.5;

  ctx.strokeStyle = CROSSHAIR_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, height);
  ctx.moveTo(0, sy);
  ctx.lineTo(width, sy);
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
