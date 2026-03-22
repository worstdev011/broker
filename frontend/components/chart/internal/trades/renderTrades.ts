/**
 * renderTrades.ts - отрисовка trade overlays на графике
 * 
 * FLOW T-OVERLAY: Trade rendering
 * 
 * Рисует:
 * - Простой отрезок от точки входа до экспирации по цене входа (синяя линия)
 * - Точку входа (белый кружок с черной точкой внутри)
 * - Точку экспирации (белый кружок с черной точкой внутри)
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import { timeToX, priceToY } from '../utils/coords';

interface RenderTradesParams {
  ctx: CanvasRenderingContext2D;
  trades: Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    amount?: number;
    snappedEntryTime?: number;
  }>;
  recentClosedTrades?: Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    snappedEntryTime?: number;
    amount?: number;
    result: 'WIN' | 'LOSS' | 'TIE';
    pnl: number;
  }>;
  viewport: Viewport;
  width: number;
  height: number;
  digits?: number;
  currentPrice?: number;
  candles: Candle[];
  liveCandle: Candle | null;
  timeframeMs: number;
  payoutPercent?: number;
}

/**
 * Находит свечу, в которой была открыта сделка
 * @returns Свеча или null, если не найдена
 */
function findCandleForTrade(
  tradeTime: number,
  candles: Candle[],
  liveCandle: Candle | null
): Candle | null {
  // Сначала проверяем лайв-свечу
  if (
    liveCandle &&
    tradeTime >= liveCandle.startTime &&
    tradeTime < liveCandle.endTime
  ) {
    return liveCandle;
  }

  // Потом ищем среди закрытых свечей
  return candles.find(
    (c) => tradeTime >= c.startTime && tradeTime < c.endTime
  ) || null;
}

/**
 * Вычисляет время центра свечи для визуального отображения
 * @returns Время центра свечи или оригинальное время, если свеча не найдена
 */
function getEntryTimeForVisualization(
  tradeTime: number,
  candles: Candle[],
  liveCandle: Candle | null,
  timeframeMs: number
): number {
  const candle = findCandleForTrade(tradeTime, candles, liveCandle);
  
  if (candle) {
    // Центр свечи = startTime + половина timeframe
    return candle.startTime + timeframeMs / 2;
  }
  
  // Fallback: используем оригинальное время, если свеча не найдена
  return tradeTime;
}

/** Форматирует оставшееся время в MM:SS */
function formatCountdown(expiresAt: number): string {
  const now = Date.now();
  const remainingMs = Math.max(0, expiresAt - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function renderTrades({
  ctx,
  trades,
  recentClosedTrades = [],
  viewport,
  width,
  height,
  digits = 5,
  currentPrice,
  candles,
  liveCandle,
  timeframeMs,
  payoutPercent = 75,
}: RenderTradesParams): void {
  if (trades.length === 0 && recentClosedTrades.length === 0) return;

  ctx.save();

  // Фильтруем видимые сделки: только открытые (expiresAt > now) и видимые по времени
  const now = Date.now();
  const visibleTrades = trades.filter((trade) => {
    // ✅ Показываем только открытые сделки (еще не истекли)
    const isOpen = trade.expiresAt > now;
    if (!isOpen) return false; // Закрытые сделки не показываем
    
    // Проверяем видимость по времени
    const timeVisible =
      (trade.openedAt >= viewport.timeStart && trade.openedAt <= viewport.timeEnd) ||
      (trade.expiresAt >= viewport.timeStart && trade.expiresAt <= viewport.timeEnd) ||
      (trade.openedAt <= viewport.timeStart && trade.expiresAt >= viewport.timeEnd);
    
    return timeVisible;
  });

  for (const trade of visibleTrades) {
    const entryTime = trade.snappedEntryTime ?? getEntryTimeForVisualization(trade.openedAt, candles, liveCandle, timeframeMs);
    const openX = timeToX(entryTime, viewport, width);
    const expireX = timeToX(trade.expiresAt, viewport, width);
    const entryPrice = Number(trade.entryPrice);
    
    if (!Number.isFinite(entryPrice)) continue;
    
    // Вычисляем Y координату
    const entryY = priceToY(entryPrice, viewport, height);
    
    const drawStartX = Math.max(0, Math.min(openX, width));
    const drawEndX = Math.max(0, Math.min(expireX, width));
    const drawY = Math.round(Math.max(5, Math.min(entryY, height - 5))) + 0.5;

    // Проверяем видимость
    const isValidX = !isNaN(drawStartX) && !isNaN(drawEndX) && isFinite(drawStartX) && isFinite(drawEndX);
    const isValidY = !isNaN(drawY) && isFinite(drawY);
    const hasLength = Math.abs(drawEndX - drawStartX) > 1;
    
    if (isValidX && isValidY && hasLength) {
      const isCall = trade.direction === 'CALL';
      const lineColor = isCall ? '#45b833' : '#ff3d1f';
      // Рисуем горизонтальную линию (отрезок) - тоньше
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(drawStartX, drawY);
      ctx.lineTo(drawEndX, drawY);
      ctx.stroke();

      // Рисуем точку входа - белая с черной точкой внутри
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(drawStartX, drawY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(drawStartX, drawY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Справа вместо точки - метка: таймер + выплата (ставка + прибыль)
      const countdownText = formatCountdown(trade.expiresAt);
      const totalPayout = trade.amount != null
        ? trade.amount + (trade.amount * payoutPercent) / 100
        : 0;
      const payoutText = trade.amount != null ? `+${totalPayout.toFixed(2)} USD` : '- USD';
      ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
      const line1W = ctx.measureText(countdownText).width;
      const line2W = ctx.measureText(payoutText).width;
      const labelW = Math.max(line1W, line2W) + 10;
      const labelH = 26;
      const padding = 4;
      const rightMargin = 65; // Место под метки цены справа
      const maxX = width - rightMargin;
      const labelX = drawEndX + padding + labelW <= maxX
        ? drawEndX + padding
        : Math.max(padding, drawEndX - labelW - padding);
      const labelY = Math.max(0, Math.min(drawY - labelH / 2, height - labelH));
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelW, labelH, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countdownText, labelX + labelW / 2, labelY + 8);
      ctx.fillText(payoutText, labelX + labelW / 2, labelY + 18);
    }
  }

  // Pocket-Option-style result badge for recently closed trades (5 sec)
  if (recentClosedTrades.length > 0) {
    const nowMs = Date.now();
    for (const t of recentClosedTrades) {
      if (t.expiresAt > nowMs) continue;

      const entryTime = t.snappedEntryTime ?? t.openedAt;
      const openX = timeToX(entryTime, viewport, width);
      const entryPrice = Number(t.entryPrice);
      if (!Number.isFinite(entryPrice)) continue;

      const entryY = priceToY(entryPrice, viewport, height);
      const dotX = Math.max(0, Math.min(openX, width));
      const dotY = Math.round(Math.max(5, Math.min(entryY, height - 5))) + 0.5;

      const isWin = t.result === 'WIN' || t.pnl > 0;
      const isLoss = t.result === 'LOSS' || t.pnl < 0;
      const bgColor = isWin ? '#45b833' : isLoss ? '#ff3d1f' : '#4b5563';

      const sign = t.pnl > 0 ? '+$' : t.pnl < 0 ? '-$' : '$';
      const amountText = `${sign}${Math.abs(t.pnl).toFixed(0)}`;

      ctx.save();

      const BADGE_H = 28;
      const BADGE_R = BADGE_H / 2;
      const ICON_SIZE = 16;
      const ICON_PAD = 6;
      const TEXT_PAD_R = 10;

      ctx.font = 'bold 14px system-ui, -apple-system, "Segoe UI", sans-serif';
      const textW = ctx.measureText(amountText).width;
      const BADGE_W = ICON_SIZE + ICON_PAD + textW + TEXT_PAD_R + ICON_PAD;

      const rightMargin = 65;
      const maxX = width - rightMargin;
      let badgeX = dotX - BADGE_W / 2;
      if (badgeX + BADGE_W > maxX) badgeX = maxX - BADGE_W;
      if (badgeX < 4) badgeX = 4;
      const badgeY = Math.max(4, dotY - BADGE_H - 8);

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, BADGE_W, BADGE_H, BADGE_R);
      ctx.fill();

      const iconCX = badgeX + ICON_PAD + ICON_SIZE / 2;
      const iconCY = badgeY + BADGE_H / 2;
      const iconR = ICON_SIZE / 2 - 1;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (isWin) {
        ctx.strokeStyle = '#45b833';
        ctx.beginPath();
        ctx.moveTo(iconCX - 3, iconCY);
        ctx.lineTo(iconCX - 0.5, iconCY + 3);
        ctx.lineTo(iconCX + 4, iconCY - 3);
        ctx.stroke();
      } else if (isLoss) {
        ctx.strokeStyle = '#ff3d1f';
        ctx.beginPath();
        ctx.moveTo(iconCX - 3, iconCY - 3);
        ctx.lineTo(iconCX + 3, iconCY + 3);
        ctx.moveTo(iconCX + 3, iconCY - 3);
        ctx.lineTo(iconCX - 3, iconCY + 3);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#4b5563';
        ctx.beginPath();
        ctx.moveTo(iconCX - 4, iconCY);
        ctx.lineTo(iconCX + 4, iconCY);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(amountText, badgeX + ICON_PAD + ICON_SIZE + ICON_PAD, badgeY + BADGE_H / 2);

      ctx.strokeStyle = bgColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(dotX, badgeY + BADGE_H);
      ctx.lineTo(dotX, dotY - 4);
      ctx.stroke();

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  ctx.restore();
}
