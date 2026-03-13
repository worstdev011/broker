/**
 * FLOW L-UI-2: Render Time Axis - метки времени снизу
 * 
 * Используется для линейного графика.
 * Таймфреймов НЕТ — это просто время.
 */

import type { TimePriceViewport } from './viewport.types';
import { getChartSettings } from '@/lib/chartSettings';
import {
  LABEL_COLOR,
  LABEL_FONT,
  TIME_LABEL_PADDING,
  TIME_AXIS_HEIGHT,
  TIME_AXIS_BG,
} from '../../chartTheme';

interface RenderTimeAxisParams {
  ctx: CanvasRenderingContext2D;
  viewport: TimePriceViewport;
  width: number;
  height: number;
}

const MIN_LABEL_SPACING = 60;

/**
 * Конвертирует время в X координату
 */
function timeToX(time: number, viewport: TimePriceViewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Форматирует время в HH:mm:ss с учетом часового пояса из настроек
 */
function formatTime(timestamp: number): string {
  const settings = getChartSettings();
  const adjustedTs = timestamp + settings.timezoneOffset * 60 * 60 * 1000;
  const date = new Date(adjustedTs);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Вычисляет оптимальный шаг для меток времени
 */
function calculateTimeStep(timeRange: number, width: number): number {
  const targetLabels = Math.floor(width / MIN_LABEL_SPACING);
  if (targetLabels <= 0) return timeRange;
  
  const timePerLabel = timeRange / targetLabels;
  
  // Округляем до "красивых" значений (5-10 секунд визуально)
  if (timePerLabel < 1000) {
    // Меньше секунды - округляем до секунд
    return Math.ceil(timePerLabel / 1000) * 1000;
  } else if (timePerLabel < 60000) {
    // Меньше минуты - округляем до секунд (5s, 10s, 30s)
    const seconds = Math.ceil(timePerLabel / 1000);
    if (seconds <= 5) return 5000;
    if (seconds <= 10) return 10000;
    if (seconds <= 30) return 30000;
    return 60000;
  } else {
    // Минуты или больше
    const minutes = Math.ceil(timePerLabel / 60000);
    return minutes * 60000;
  }
}

export function renderTimeAxis({
  ctx,
  viewport,
  width,
  height,
}: RenderTimeAxisParams): void {
  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;

  if (timeRange <= 0) return;

  ctx.save();

  ctx.fillStyle = TIME_AXIS_BG;
  ctx.fillRect(0, height - TIME_AXIS_HEIGHT, width, TIME_AXIS_HEIGHT);

  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const stepMs = calculateTimeStep(timeRange, width);
  const startTime = Math.ceil(timeStart / stepMs) * stepMs;

  let tCount = 0;
  for (let time = startTime; time <= timeEnd && tCount < 200; time += stepMs, tCount++) {
    const x = timeToX(time, viewport, width);
    if (x < 0 || x > width) continue;

    const timeText = formatTime(time);
    ctx.fillText(timeText, x, height - TIME_LABEL_PADDING);
  }

  ctx.restore();
}
