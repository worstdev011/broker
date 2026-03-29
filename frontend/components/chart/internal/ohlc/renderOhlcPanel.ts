/**
 * renderOhlcPanel.ts - отрисовка OHLC панели
 * 
 * FLOW G8: OHLC panel rendering
 */

import type { OhlcData } from './ohlc.types';

interface RenderOhlcPanelParams {
  ctx: CanvasRenderingContext2D;
  ohlc: OhlcData | null;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту). */
  digits?: number;
  /** Подписи O/H/L/C (локаль). */
  labels?: { open: string; high: string; low: string; close: string };
}

const PANEL_TEXT_COLOR = 'rgba(255, 255, 255, 0.45)'; // Как у меток осей
const PANEL_PADDING = 14; // Увеличен отступ для большего воздуха
const PANEL_MARGIN = 8; // Отступ слева
const PANEL_MARGIN_BOTTOM = 35; // Отступ снизу
import { LABEL_FONT } from '../chartTheme';
const PANEL_FONT = LABEL_FONT;
const PANEL_LINE_HEIGHT = 22; // Увеличено расстояние между строками

/**
 * Форматирует цену: по digits инструмента или 5 по умолчанию (forex).
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '-';
  return price.toFixed(digits ?? 5);
}

export function renderOhlcPanel({
  ctx,
  ohlc,
  width,
  height,
  digits,
  labels,
}: RenderOhlcPanelParams): void {
  if (!ohlc) {
    return;
  }

  ctx.save();

  // Настройки текста
  ctx.font = PANEL_FONT;
  ctx.fillStyle = PANEL_TEXT_COLOR;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const lo = labels?.open ?? 'Open';
  const lh = labels?.high ?? 'High';
  const ll = labels?.low ?? 'Low';
  const lc = labels?.close ?? 'Close';

  // Форматируем значения по digits инструмента
  const openLabel = `${lo}: ${formatPrice(ohlc.open, digits)}`;
  const highLabel = `${lh}: ${formatPrice(ohlc.high, digits)}`;
  const lowLabel = `${ll}: ${formatPrice(ohlc.low, digits)}`;
  const closeLabel = `${lc}: ${formatPrice(ohlc.close, digits)}`;

  // Вычисляем высоту блока OHLC (без фоновой плашки)
  const lineCount = 4;
  const panelHeight = lineCount * PANEL_LINE_HEIGHT + PANEL_PADDING * 2;

  // Позиция панели (левый нижний угол)
  const panelX = PANEL_MARGIN;
  const panelY = height - panelHeight - PANEL_MARGIN_BOTTOM;

  let currentY = panelY + PANEL_PADDING;
  ctx.fillStyle = PANEL_TEXT_COLOR;
  ctx.fillText(openLabel, panelX + PANEL_PADDING, currentY);
  currentY += PANEL_LINE_HEIGHT;

  ctx.fillText(highLabel, panelX + PANEL_PADDING, currentY);
  currentY += PANEL_LINE_HEIGHT;

  ctx.fillText(lowLabel, panelX + PANEL_PADDING, currentY);
  currentY += PANEL_LINE_HEIGHT;

  ctx.fillText(closeLabel, panelX + PANEL_PADDING, currentY);

  ctx.restore();
}
