/**
 * renderAxes.ts - отрисовка осей графика
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import { getChartSettings } from '@/lib/chartSettings';

interface RenderAxesParams {
  ctx: CanvasRenderingContext2D; // Нативный тип браузера
  viewport: Viewport;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту). Если задано — используется вместо авто-логики по величине цены. */
  digits?: number;
}

const AXIS_COLOR = 'rgba(255, 255, 255, 0.3)';
const LABEL_COLOR = 'rgba(255, 255, 255, 0.45)';
const LABEL_FONT = '12px sans-serif';
const LABEL_PADDING = 8;
const MIN_LABEL_SPACING = 60; // Минимальное расстояние между подписями в пикселях
const TIME_LABEL_BG_HEIGHT = 25; // Высота фона для меток времени
const PRICE_LABEL_BG_WIDTH = 60; // Ширина фона для меток цены справа (уменьшено)
// Чуть темнее фона графика (#061230) для меток времени
const TIME_LABEL_BG_COLOR = '#05122a';
const PRICE_LABEL_PADDING = 4; // Паддинг для меток цены справа (меньше чем общий LABEL_PADDING)
const PRICE_LABEL_OFFSET_ABOVE_GRID = 12; // Смещение метки вверх от линии сетки (≈ половина высоты шрифта + зазор)

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
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

/**
 * Форматирует время в HH:mm:ss с учетом часового пояса из настроек
 */
function formatTime(timestamp: number): string {
  const settings = getChartSettings();
  // Применяем смещение часового пояса
  const adjustedTs = timestamp + settings.timezoneOffset * 60 * 60 * 1000;
  const date = new Date(adjustedTs);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
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

/**
 * Вычисляет оптимальный шаг для подписей времени
 */
function calculateTimeLabelStep(timeRange: number, width: number): number {
  const targetLabels = Math.floor(width / MIN_LABEL_SPACING);
  if (targetLabels <= 0) return timeRange;
  
  const timePerLabel = timeRange / targetLabels;
  
  // Округляем до "красивых" значений (секунды, минуты, часы)
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

/**
 * Вычисляет оптимальный шаг для подписей цены.
 * Должен совпадать с calculatePriceStep в renderGrid — иначе метки и сетка расходятся при скролле.
 */
function calculatePriceStep(priceRange: number, height: number): number {
  if (height <= 0 || priceRange <= 0) return priceRange || 1;

  const targetSteps = 10;
  const pixelsPerStep = height / targetSteps;
  const pricePerPixel = priceRange / height;
  const priceStep = pixelsPerStep * pricePerPixel;

  if (!Number.isFinite(priceStep) || priceStep <= 0) return priceRange || 1;

  const magnitude = Math.pow(10, Math.floor(Math.log10(priceStep)));
  if (!Number.isFinite(magnitude) || magnitude <= 0) return priceRange || 1;

  const normalized = priceStep / magnitude;

  let step: number;
  if (normalized <= 1) step = 1;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 5) step = 5;
  else step = 10;

  return step * magnitude;
}

export function renderAxes({
  ctx,
  viewport,
  width,
  height,
  digits,
}: RenderAxesParams): void {
  ctx.save();

  ctx.strokeStyle = AXIS_COLOR;
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const timeRange = viewport.timeEnd - viewport.timeStart;
  const priceRange = viewport.priceMax - viewport.priceMin;

  // X-ось (внизу) - время: рисуем от нижней границы вверх, чтобы ничего не выходило за экран
  if (timeRange > 0) {
    ctx.fillStyle = TIME_LABEL_BG_COLOR;
    ctx.fillRect(0, height - TIME_LABEL_BG_HEIGHT, width, TIME_LABEL_BG_HEIGHT);

    const timeStep = calculateTimeLabelStep(timeRange, width);
    const startTime = Math.ceil(viewport.timeStart / timeStep) * timeStep;

    ctx.fillStyle = LABEL_COLOR;
    ctx.textBaseline = 'alphabetic';
    const MAX_AXIS_LABELS = 100;
    let labelCount = 0;
    for (let time = startTime; time <= viewport.timeEnd && labelCount < MAX_AXIS_LABELS; time += timeStep) {
      if (timeStep <= 0) break;
      labelCount++;
      const x = timeToX(time, viewport, width);
      if (x >= 0 && x <= width) {
        ctx.fillText(formatTime(time), x, height - LABEL_PADDING);
      }
    }
  }

  // Y-ось (справа) - цены
  if (priceRange > 0) {
    const priceStep = calculatePriceStep(priceRange, height);
    const startPrice = Math.ceil(viewport.priceMin / priceStep) * priceStep;

    ctx.fillStyle = LABEL_COLOR; // Восстанавливаем цвет для текста
    ctx.textAlign = 'center'; // Выравнивание по центру
    ctx.textBaseline = 'middle';
    // Центр области меток цены: правая граница минус половина ширины области
    const priceLabelCenterX = width - PRICE_LABEL_BG_WIDTH / 2;
    const MAX_AXIS_LABELS = 100;
    let labelCount = 0;
    for (let price = startPrice; price <= viewport.priceMax && labelCount < MAX_AXIS_LABELS; price += priceStep) {
      if (priceStep <= 0) break;
      labelCount++;
      const y = priceToY(price, viewport, height);
      if (y >= 0 && y <= height) {
        ctx.fillText(formatPrice(price, digits), priceLabelCenterX, y - PRICE_LABEL_OFFSET_ABOVE_GRID);
      }
    }
  }

  ctx.restore();
}
