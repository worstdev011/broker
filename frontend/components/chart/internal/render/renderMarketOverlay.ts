/**
 * renderMarketOverlay.ts - отрисовка оверлея "Market Closed"
 * 
 * FLOW C-MARKET-CLOSED: Overlay когда рынок закрыт
 * FLOW C-MARKET-COUNTDOWN: Таймер обратного отсчета
 */

export type MarketStatus = 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';

export interface MarketCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

import type { ChartCanvasCopy } from '../chartCanvasCopy.types';

interface RenderMarketOverlayParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  status: MarketStatus;
  countdown?: MarketCountdown; // FLOW C-MARKET-COUNTDOWN: таймер обратного отсчета
  copy?: ChartCanvasCopy;
}

/**
 * Рисует оверлей "Market Closed" поверх графика
 */
export function renderMarketClosedOverlay({
  ctx,
  width,
  height,
  status,
  countdown,
  copy,
}: RenderMarketOverlayParams): void {
  ctx.save();

  const c = copy;

  // Затемнение фона
  ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Заголовок
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 18px Inter, system-ui, sans-serif';

  let title = c?.marketClosedTitle ?? 'Market closed';
  let subtitle = '';

  const resume = c?.marketResumeIn ?? 'Trading resumes in';

  switch (status) {
    case 'WEEKEND':
      subtitle = countdown ? resume : (c?.marketWeekendIdle ?? 'Trading is closed on weekends');
      break;

    case 'HOLIDAY':
      subtitle = countdown ? resume : (c?.marketHolidayIdle ?? 'Trading will resume soon');
      break;

    case 'MAINTENANCE':
      subtitle = countdown ? resume : (c?.marketMaintenanceIdle ?? 'Trading systems are being updated');
      break;

    case 'OPEN':
      // Не должно вызываться для OPEN статуса
      ctx.restore();
      return;
  }

  const blockOffsetY = -100; // Смещение всего блока вверх

  ctx.fillText(title, width / 2, height / 2 - 30 + blockOffsetY);

  // Подзаголовок
  ctx.font = '400 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#9aa4b2';
  ctx.fillText(subtitle, width / 2, height / 2 - 6 + blockOffsetY);

  // FLOW C-MARKET-COUNTDOWN: Таймер обратного отсчета
  if (countdown) {
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#4ade80'; // Зеленый цвет для таймера

    const text =
      countdown.days > 0
        ? (c?.formatCountdownDHM ?? ((d, h, m) => `${d}d ${h}h ${m}m`))(
            countdown.days,
            countdown.hours,
            countdown.minutes,
          )
        : (c?.formatCountdownHMS ?? ((h, m, s) => `${h}h ${m}m ${s}s`))(
            countdown.hours,
            countdown.minutes,
            countdown.seconds,
          );

    ctx.fillText(text, width / 2, height / 2 + 26 + blockOffsetY);
  }

  ctx.restore();
}
