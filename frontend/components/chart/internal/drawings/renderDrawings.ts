/**
 * renderDrawings.ts - отрисовка drawings
 * 
 * FLOW G14: Drawing rendering
 * 
 * Ответственность:
 * - Рисование всех drawings поверх графика
 * - Корректное масштабирование при pan/zoom
 */

import type { Drawing } from './drawing.types';
import type { Viewport } from '../viewport.types';

interface RenderDrawingsParams {
  ctx: CanvasRenderingContext2D;
  drawings: Drawing[];
  viewport: Viewport;
  width: number;
  height: number;
  hoveredDrawingId?: string | null; // FLOW G16: Hover state
  selectedDrawingId?: string | null; // FLOW G16: Selected (editing) state
}

const LINE_WIDTH = 1.5;
const LINE_WIDTH_SELECTED = 2.5; // FLOW G16: Толще для выбранной линии
const LINE_OPACITY = 0.8;
const LINE_OPACITY_HOVER = 1.0; // FLOW G16: Ярче при hover
const POINT_RADIUS = 4; // FLOW G16: Радиус точек для trend line

/**
 * Конвертирует time в X координату
 */
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Конвертирует price в Y координату
 */
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

/**
 * Рисует горизонтальную линию
 */
function renderHorizontalLine(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'horizontal' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const y = priceToY(drawing.price, viewport, height);

  // Проверяем, видна ли линия в viewport
  if (drawing.price < viewport.priceMin || drawing.price > viewport.priceMax) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  const label = drawing.price.toFixed(5);
  ctx.font = '11px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width;
  const lx = width - tw - 8;
  const ly = y;
  ctx.fillStyle = drawing.color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(lx - 4, ly - 8, tw + 8, 16);
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 1.0;
  ctx.fillText(label, lx, ly);

  ctx.restore();
}

/**
 * Рисует вертикальную линию
 */
function renderVerticalLine(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'vertical' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const x = timeToX(drawing.time, viewport, width);

  // Проверяем, видна ли линия в viewport
  if (drawing.time < viewport.timeStart || drawing.time > viewport.timeEnd) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();

  const d = new Date(drawing.time);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const timeLabel = `${hh}:${mm}:${ss}`;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(timeLabel).width;
  ctx.fillStyle = drawing.color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x - tw / 2 - 4, height - 18, tw + 8, 16);
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 1.0;
  ctx.fillText(timeLabel, x, height - 17);

  ctx.restore();
}

/**
 * Рисует trend line
 */
function renderTrendLine(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'trend' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  // Проверяем, видна ли хотя бы часть линии в viewport
  const minTime = Math.min(drawing.start.time, drawing.end.time);
  const maxTime = Math.max(drawing.start.time, drawing.end.time);
  const minPrice = Math.min(drawing.start.price, drawing.end.price);
  const maxPrice = Math.max(drawing.start.price, drawing.end.price);

  // Если линия полностью вне viewport, не рисуем
  if (
    maxTime < viewport.timeStart ||
    minTime > viewport.timeEnd ||
    maxPrice < viewport.priceMin ||
    minPrice > viewport.priceMax
  ) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  // Рисуем линию
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // FLOW G16: Рисуем точки start/end если hovered или selected
  if (isHovered || isSelected) {
    ctx.fillStyle = drawing.color;
    ctx.globalAlpha = 1.0;

    // Start point
    ctx.beginPath();
    ctx.arc(x1, y1, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // End point
    ctx.beginPath();
    ctx.arc(x2, y2, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const ARROW_HEAD_LEN = 10;
const ARROW_HEAD_ANGLE = 0.4;

/**
 * Рисует стрелку: линия start→end + наконечник на конце
 */
function renderArrow(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'arrow' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  const minTime = Math.min(drawing.start.time, drawing.end.time);
  const maxTime = Math.max(drawing.start.time, drawing.end.time);
  const minPrice = Math.min(drawing.start.price, drawing.end.price);
  const maxPrice = Math.max(drawing.start.price, drawing.end.price);

  if (
    maxTime < viewport.timeStart ||
    minTime > viewport.timeEnd ||
    maxPrice < viewport.priceMin ||
    minPrice > viewport.priceMax
  ) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.fillStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);
  const leftX = x2 - ARROW_HEAD_LEN * Math.cos(angle - ARROW_HEAD_ANGLE);
  const leftY = y2 - ARROW_HEAD_LEN * Math.sin(angle - ARROW_HEAD_ANGLE);
  const rightX = x2 - ARROW_HEAD_LEN * Math.cos(angle + ARROW_HEAD_ANGLE);
  const rightY = y2 - ARROW_HEAD_LEN * Math.sin(angle + ARROW_HEAD_ANGLE);
  ctx.beginPath();
  ctx.moveTo(leftX, leftY);
  ctx.lineTo(x2, y2);
  ctx.lineTo(rightX, rightY);
  ctx.fill();

  if (isHovered || isSelected) {
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(x1, y1, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Луч: от start через end до границы viewport в направлении end
 */
function renderRay(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'ray' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  const dx = x2 - x1;
  const dy = y2 - y1;

  let xEnd: number, yEnd: number;
  if (Math.abs(dx) < 1e-6) {
    // Почти вертикальный луч — тянем до верхней или нижней границы
    xEnd = x1;
    yEnd = dy >= 0 ? height : 0;
  } else if (dx > 0) {
    // Луч идёт вправо
    xEnd = width;
    yEnd = y1 + (dy / dx) * (width - x1);
  } else {
    // Луч идёт влево
    xEnd = 0;
    yEnd = y1 + (dy / dx) * (-x1);
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(xEnd, yEnd);
  ctx.stroke();

  if (isHovered || isSelected) {
    ctx.fillStyle = drawing.color;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(x1, y1, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const RECT_FILL_OPACITY = 0.12; // Полупрозрачная заливка области

/**
 * Рисует прямоугольник (область)
 */
function renderRectangle(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'rectangle' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const t1 = Math.min(drawing.start.time, drawing.end.time);
  const t2 = Math.max(drawing.start.time, drawing.end.time);
  const p1 = Math.min(drawing.start.price, drawing.end.price);
  const p2 = Math.max(drawing.start.price, drawing.end.price);

  const x1 = timeToX(t1, viewport, width);
  const y1 = priceToY(p2, viewport, height); // высокий price — верх
  const x2 = timeToX(t2, viewport, width);
  const y2 = priceToY(p1, viewport, height);

  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectW = Math.abs(x2 - x1);
  const rectH = Math.abs(y2 - y1);

  if (
    t2 < viewport.timeStart ||
    t1 > viewport.timeEnd ||
    p2 < viewport.priceMin ||
    p1 > viewport.priceMax
  ) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  ctx.fillStyle = drawing.color;
  ctx.globalAlpha = RECT_FILL_OPACITY * (isHovered || isSelected ? 1.5 : 1);
  ctx.fillRect(rectX, rectY, rectW, rectH);

  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.strokeRect(rectX, rectY, rectW, rectH);

  // Угловые точки для ресайза (как у trend line)
  if (isHovered || isSelected) {
    ctx.fillStyle = drawing.color;
    ctx.globalAlpha = 1.0;
    const corners = [
      [x1, y1],
      [x2, y1],
      [x1, y2],
      [x2, y2],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Уровни Фибоначчи-ретрасмента: 0, 23.6, 38.2, 50, 61.8, 78.6, 100% */
const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/**
 * Рисует Фибоначчи-ретрасмент: линия start→end + горизонтальные уровни по соотношениям
 */
function renderFibonacci(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'fibonacci' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  const minTime = Math.min(drawing.start.time, drawing.end.time);
  const maxTime = Math.max(drawing.start.time, drawing.end.time);
  const priceLow = Math.min(drawing.start.price, drawing.end.price);
  const priceHigh = Math.max(drawing.start.price, drawing.end.price);
  const priceRange = priceHigh - priceLow;

  // 🔥 FIX: priceHigh < priceMin && priceLow > priceMax невозможно (priceHigh >= priceLow всегда).
  // Рисунок за экраном по вертикали: выше viewport ИЛИ ниже viewport → OR, не AND
  if (
    maxTime < viewport.timeStart ||
    minTime > viewport.timeEnd ||
    priceHigh < viewport.priceMin ||
    priceLow > viewport.priceMax
  ) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  // Основная линия (start → end)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const FIB_LABELS = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%'];
  const xMin = Math.min(x1, x2);
  const xMax = Math.max(x1, x2);

  ctx.font = '10px system-ui, sans-serif';
  ctx.textBaseline = 'bottom';

  for (let fi = 0; fi < FIB_RATIOS.length; fi++) {
    const ratio = FIB_RATIOS[fi];
    const price = priceLow + priceRange * ratio;
    if (price < viewport.priceMin || price > viewport.priceMax) continue;
    const y = priceToY(price, viewport, height);
    ctx.beginPath();
    ctx.moveTo(xMin, y);
    ctx.lineTo(xMax, y);
    ctx.stroke();

    ctx.fillStyle = drawing.color;
    ctx.globalAlpha = 0.7;
    ctx.fillText(`${FIB_LABELS[fi]}  ${price.toFixed(5)}`, xMax + 4, y - 2);
    ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  }

  if (isHovered || isSelected) {
    ctx.fillStyle = drawing.color;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(x1, y1, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const CHANNEL_FILL_OPACITY = 0.12;

/**
 * Параллельный канал: базовая линия start→end, вторая линия со сдвигом offset, заливка между ними
 */
function renderParallelChannel(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing & { type: 'parallel-channel' },
  viewport: Viewport,
  width: number,
  height: number,
  isHovered: boolean,
  isSelected: boolean
): void {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);
  const y1p = priceToY(drawing.start.price + drawing.offset, viewport, height);
  const y2p = priceToY(drawing.end.price + drawing.offset, viewport, height);

  const minTime = Math.min(drawing.start.time, drawing.end.time);
  const maxTime = Math.max(drawing.start.time, drawing.end.time);
  const prices = [drawing.start.price, drawing.end.price, drawing.start.price + drawing.offset, drawing.end.price + drawing.offset];
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);

  if (
    maxTime < viewport.timeStart ||
    minTime > viewport.timeEnd ||
    maxP < viewport.priceMin ||
    minP > viewport.priceMax
  ) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.lineWidth = isSelected ? LINE_WIDTH_SELECTED : LINE_WIDTH;
  ctx.setLineDash([]);

  // Заливка между линиями (четырёхугольник)
  ctx.fillStyle = drawing.color;
  ctx.globalAlpha = CHANNEL_FILL_OPACITY * (isHovered || isSelected ? 1.5 : 1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2, y2p);
  ctx.lineTo(x1, y1p);
  ctx.closePath();
  ctx.fill();

  // Две линии контура
  ctx.globalAlpha = isHovered || isSelected ? LINE_OPACITY_HOVER : LINE_OPACITY;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1p);
  ctx.lineTo(x2, y2p);
  ctx.stroke();

  // Три ручки: start, end, центр параллельной линии
  if (isHovered || isSelected) {
    ctx.fillStyle = drawing.color;
    ctx.globalAlpha = 1.0;
    const midT = (drawing.start.time + drawing.end.time) / 2;
    const midP = (drawing.start.price + drawing.end.price) / 2 + drawing.offset;
    const xMid = timeToX(midT, viewport, width);
    const yMid = priceToY(midP, viewport, height);
    for (const [x, y] of [[x1, y1], [x2, y2], [xMid, yMid]]) {
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function renderDrawings({
  ctx,
  drawings,
  viewport,
  width,
  height,
  hoveredDrawingId = null,
  selectedDrawingId = null,
}: RenderDrawingsParams): void {
  if (drawings.length === 0) return;

  // Рисуем все drawings
  for (const drawing of drawings) {
    const isHovered = drawing.id === hoveredDrawingId;
    const isSelected = drawing.id === selectedDrawingId;

    switch (drawing.type) {
      case 'horizontal':
        renderHorizontalLine(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'vertical':
        renderVerticalLine(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'trend':
        renderTrendLine(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'rectangle':
        renderRectangle(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'fibonacci':
        renderFibonacci(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'parallel-channel':
        renderParallelChannel(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'ray':
        renderRay(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
      case 'arrow':
        renderArrow(ctx, drawing, viewport, width, height, isHovered, isSelected);
        break;
    }
  }
}
