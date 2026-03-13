/**
 * renderCountdown - FLOW C4-C5: Рендеринг таймера обратного отсчета рядом со свечой
 * 
 * Ответственность:
 * - Отрисовка текста таймфрейма и обратного отсчета справа от лайв-свечи
 * - Позиционирование на уровне верхней части свечи
 * 
 * FLOW C4: Позиционирование по геометрии свечи, не по времени
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import { timeToX, priceToY } from '../utils/coords';
import { LABEL_COLOR, LABEL_FONT } from '../chartTheme';

interface RenderCountdownParams {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  liveCandle: Candle | null;
  width: number;
  height: number;
  timeframeMs: number;
  timeframeLabel: string;
  remainingTime: string;
  candleWidth: number;
}

const PADDING = 12;
const LINE_HEIGHT = 16;

export function renderCountdown({
  ctx,
  viewport,
  liveCandle,
  width,
  height,
  timeframeMs,
  timeframeLabel,
  remainingTime,
  candleWidth,
}: RenderCountdownParams): void {
  // Если нет лайв-свечи или она не видна, не рисуем
  if (!liveCandle) {
    return;
  }

  // FLOW C4: Позиционирование по геометрии свечи
  // Центр свечи вычисляется по времени (середина временного слота)
  const candleCenterTime = liveCandle.startTime + timeframeMs / 2;
  const candleCenterX = timeToX(candleCenterTime, viewport, width);
  
  // Правая граница свечи = центр + половина ширины
  const candleRightX = candleCenterX + candleWidth / 2;
  
  // Вычисляем координату линии текущей цены (close price)
  const currentPriceY = priceToY(liveCandle.close, viewport, height);
  
  // X позиция: справа от свечи + отступ
  const textX = candleRightX + PADDING;

  ctx.font = LABEL_FONT;
  const textW = Math.max(ctx.measureText(timeframeLabel).width, ctx.measureText(remainingTime).width);

  if (textX > width - textW - 8) {
    const candleLeftX = candleCenterX - candleWidth / 2;
    const adjustedTextX = candleLeftX - PADDING - textW;
    if (adjustedTextX >= 0) {
      // Метка таймфрейма выше линии текущей цены
      const timeframeY = currentPriceY - LINE_HEIGHT - 4;
      // Таймер ниже линии текущей цены
      const countdownY = currentPriceY + 4;
      renderText(ctx, adjustedTextX, timeframeY, countdownY, timeframeLabel, remainingTime);
    }
    // Если и слева не помещается, не рисуем
  } else {
    // Метка таймфрейма выше линии текущей цены
    const timeframeY = currentPriceY - LINE_HEIGHT - 4;
    // Таймер ниже линии текущей цены
    const countdownY = currentPriceY + 4;
    renderText(ctx, textX, timeframeY, countdownY, timeframeLabel, remainingTime);
  }
}

/**
 * Рисует текст таймфрейма и таймера (без фона, как на фото)
 * timeframeLabel - выше линии текущей цены
 * remainingTime - ниже линии текущей цены
 */
function renderText(
  ctx: CanvasRenderingContext2D,
  x: number,
  timeframeY: number,
  countdownY: number,
  timeframeLabel: string,
  remainingTime: string
): void {
  ctx.save();

  ctx.font = LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = LABEL_COLOR;

  // Рисуем метку таймфрейма выше линии текущей цены
  ctx.fillText(timeframeLabel, x, timeframeY);

  // Рисуем обратный отсчет ниже линии текущей цены
  ctx.fillText(remainingTime, x, countdownY);

  ctx.restore();
}
