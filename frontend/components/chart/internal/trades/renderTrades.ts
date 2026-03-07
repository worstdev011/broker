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

interface RenderTradesParams {
  ctx: CanvasRenderingContext2D;
  trades: Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    amount?: number;
  }>;
  viewport: Viewport;
  width: number;
  height: number;
  digits?: number;
  currentPrice?: number; // Не используется, но оставляем для совместимости
  /** Свечи для поиска свечи, в которой была открыта сделка */
  candles: Candle[];
  /** Лайв-свеча для проверки текущей свечи */
  liveCandle: Candle | null;
  /** Timeframe в миллисекундах для вычисления центра свечи */
  timeframeMs: number;
  /** Процент выплаты для отображения потенциальной прибыли */
  payoutPercent?: number;
}

/**
 * Конвертирует время в X координату
 */
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  
  const normalizedPrice = (price - viewport.priceMin) / priceRange;
  const y = height - (normalizedPrice * height);
  
  return y;
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
  if (trades.length === 0) return;

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

  if (visibleTrades.length === 0) {
    ctx.restore();
    return;
  }

  for (const trade of visibleTrades) {
    // Находим свечу, в которой была открыта сделка
    const entryCandle = findCandleForTrade(trade.openedAt, candles, liveCandle);
    
    // Используем время начала свечи для визуализации, чтобы точка совпадала с началом свечи
    const entryTime = entryCandle ? entryCandle.startTime : trade.openedAt;
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

      // Справа вместо точки — метка: таймер + выплата (ставка + прибыль)
      const countdownText = formatCountdown(trade.expiresAt);
      const totalPayout = trade.amount != null
        ? trade.amount + (trade.amount * payoutPercent) / 100
        : 0;
      const payoutText = trade.amount != null ? `+${totalPayout.toFixed(2)} USD` : '— USD';
      ctx.font = '10px sans-serif';
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

  ctx.restore();
}
