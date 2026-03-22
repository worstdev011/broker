/**
 * drawing.hitTest.ts - определение попадания курсора на drawing
 * 
 * FLOW G16: Hit testing for drawings
 */

import type { Drawing } from './drawing.types';
import type { Viewport } from '../viewport.types';
import type { DrawingEditMode } from './drawing.types';
import { timeToX, priceToY } from '../utils/coords';

interface HitTestResult {
  hit: boolean;
  mode: DrawingEditMode | null;
}

interface HitTestDrawingParams {
  drawing: Drawing;
  mouseX: number;
  mouseY: number;
  viewport: Viewport;
  width: number;
  height: number;
  tolerance?: number; // в пикселях
}

const DEFAULT_TOLERANCE = 7; // пикселей

/**
 * Расстояние между двумя точками
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Расстояние от точки до линии (для trend line)
 */
function distanceToLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = 0;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Hit test для horizontal line
 */
function hitTestHorizontal(
  drawing: Drawing & { type: 'horizontal' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const y = priceToY(drawing.price, viewport, height);

  // Проверяем попадание по Y
  if (Math.abs(mouseY - y) <= tolerance) {
    return {
      hit: true,
      mode: 'move',
    };
  }

  return { hit: false, mode: null };
}

/**
 * Hit test для vertical line
 */
function hitTestVertical(
  drawing: Drawing & { type: 'vertical' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const x = timeToX(drawing.time, viewport, width);

  // Проверяем попадание по X
  if (Math.abs(mouseX - x) <= tolerance) {
    return {
      hit: true,
      mode: 'move',
    };
  }

  return { hit: false, mode: null };
}

/**
 * Hit test для trend line
 */
function hitTestTrend(
  drawing: Drawing & { type: 'trend' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  // Проверяем попадание на start point
  const distToStart = distance(mouseX, mouseY, x1, y1);
  if (distToStart <= tolerance) {
    return {
      hit: true,
      mode: 'resize-start',
    };
  }

  // Проверяем попадание на end point
  const distToEnd = distance(mouseX, mouseY, x2, y2);
  if (distToEnd <= tolerance) {
    return {
      hit: true,
      mode: 'resize-end',
    };
  }

  // Проверяем попадание на тело линии
  const distToLine = distanceToLine(mouseX, mouseY, x1, y1, x2, y2);
  if (distToLine <= tolerance) {
    return {
      hit: true,
      mode: 'move',
    };
  }

  return { hit: false, mode: null };
}

/**
 * Hit test для стрелки (как у тренда: концы + тело линии)
 */
function hitTestArrow(
  drawing: Drawing & { type: 'arrow' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  const distToStart = distance(mouseX, mouseY, x1, y1);
  if (distToStart <= tolerance) return { hit: true, mode: 'resize-start' };
  const distToEnd = distance(mouseX, mouseY, x2, y2);
  if (distToEnd <= tolerance) return { hit: true, mode: 'resize-end' };
  const distToLine = distanceToLine(mouseX, mouseY, x1, y1, x2, y2);
  if (distToLine <= tolerance) return { hit: true, mode: 'move' };
  return { hit: false, mode: null };
}

/**
 * Hit test для Фибоначчи (как у тренда: концы + тело линии)
 */
function hitTestFibonacci(
  drawing: Drawing & { type: 'fibonacci' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  const distToStart = distance(mouseX, mouseY, x1, y1);
  if (distToStart <= tolerance) return { hit: true, mode: 'resize-start' };
  const distToEnd = distance(mouseX, mouseY, x2, y2);
  if (distToEnd <= tolerance) return { hit: true, mode: 'resize-end' };
  const distToLine = distanceToLine(mouseX, mouseY, x1, y1, x2, y2);
  if (distToLine <= tolerance) return { hit: true, mode: 'move' };
  return { hit: false, mode: null };
}

/** Радиус попадания по углам области - больше, чем у отрисовки, чтобы курсор «по диагонали» срабатывал при наведении на точки */
const RECT_CORNER_HIT_RADIUS = 10;

/**
 * Hit test для прямоугольника (область): сначала углы (растягивание), потом тело (перемещение)
 */
function hitTestRectangle(
  drawing: Drawing & { type: 'rectangle' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const minT = Math.min(drawing.start.time, drawing.end.time);
  const maxT = Math.max(drawing.start.time, drawing.end.time);
  const minP = Math.min(drawing.start.price, drawing.end.price);
  const maxP = Math.max(drawing.start.price, drawing.end.price);

  const xL = timeToX(minT, viewport, width);
  const xR = timeToX(maxT, viewport, width);
  const yT = priceToY(maxP, viewport, height);
  const yB = priceToY(minP, viewport, height);

  const corners: { x: number; y: number; mode: 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' }[] = [
    { x: xL, y: yT, mode: 'resize-tl' },
    { x: xR, y: yT, mode: 'resize-tr' },
    { x: xL, y: yB, mode: 'resize-bl' },
    { x: xR, y: yB, mode: 'resize-br' },
  ];

  const cornerRadius = Math.max(tolerance, RECT_CORNER_HIT_RADIUS);
  for (const c of corners) {
    if (distance(mouseX, mouseY, c.x, c.y) <= cornerRadius) {
      return { hit: true, mode: c.mode };
    }
  }

  const left = xL;
  const right = xR;
  const top = yT;
  const bottom = yB;
  const inside = mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom;
  const onBorder =
    (Math.abs(mouseX - left) <= tolerance || Math.abs(mouseX - right) <= tolerance ||
     Math.abs(mouseY - top) <= tolerance || Math.abs(mouseY - bottom) <= tolerance) &&
    !corners.some((c) => distance(mouseX, mouseY, c.x, c.y) <= cornerRadius);

  if (inside || onBorder) {
    return { hit: true, mode: 'move' };
  }
  return { hit: false, mode: null };
}

/**
 * Проверка, лежит ли точка внутри многоугольника (ray casting)
 */
function pointInPolygon(px: number, py: number, xs: number[], ys: number[]): boolean {
  let inside = false;
  const n = xs.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = xs[i], yi = ys[i];
    const xj = xs[j], yj = ys[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Hit test для параллельного канала: start, end, anchor (центр второй линии), тело (линии + заливка)
 */
function hitTestParallelChannel(
  drawing: Drawing & { type: 'parallel-channel' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);
  const y1p = priceToY(drawing.start.price + drawing.offset, viewport, height);
  const y2p = priceToY(drawing.end.price + drawing.offset, viewport, height);

  const midT = (drawing.start.time + drawing.end.time) / 2;
  const midP = (drawing.start.price + drawing.end.price) / 2 + drawing.offset;
  const xMid = timeToX(midT, viewport, width);
  const yMid = priceToY(midP, viewport, height);

  if (distance(mouseX, mouseY, x1, y1) <= tolerance) return { hit: true, mode: 'resize-start' };
  if (distance(mouseX, mouseY, x2, y2) <= tolerance) return { hit: true, mode: 'resize-end' };
  if (distance(mouseX, mouseY, xMid, yMid) <= tolerance) return { hit: true, mode: 'resize-offset' };

  const distBase = distanceToLine(mouseX, mouseY, x1, y1, x2, y2);
  const distParallel = distanceToLine(mouseX, mouseY, x1, y1p, x2, y2p);
  if (distBase <= tolerance || distParallel <= tolerance) return { hit: true, mode: 'move' };

  const inside = pointInPolygon(mouseX, mouseY, [x1, x2, x2, x1], [y1, y2, y2p, y1p]);
  if (inside) return { hit: true, mode: 'move' };

  return { hit: false, mode: null };
}

/**
 * Расстояние от точки до луча (полупрямая от start в направлении end)
 */
function distanceToRay(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? Math.max(0, dot / lenSq) : 0;
  const xx = x1 + param * C;
  const yy = y1 + param * D;
  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
}

/**
 * Hit test для луча: start, end (направление), тело луча
 */
function hitTestRay(
  drawing: Drawing & { type: 'ray' },
  mouseX: number,
  mouseY: number,
  viewport: Viewport,
  width: number,
  height: number,
  tolerance: number
): HitTestResult {
  const x1 = timeToX(drawing.start.time, viewport, width);
  const y1 = priceToY(drawing.start.price, viewport, height);
  const x2 = timeToX(drawing.end.time, viewport, width);
  const y2 = priceToY(drawing.end.price, viewport, height);

  if (distance(mouseX, mouseY, x1, y1) <= tolerance) return { hit: true, mode: 'resize-start' };
  if (distance(mouseX, mouseY, x2, y2) <= tolerance) return { hit: true, mode: 'resize-end' };
  if (distanceToRay(mouseX, mouseY, x1, y1, x2, y2) <= tolerance) return { hit: true, mode: 'move' };
  return { hit: false, mode: null };
}

/**
 * Hit test для drawing
 */
export function hitTestDrawing({
  drawing,
  mouseX,
  mouseY,
  viewport,
  width,
  height,
  tolerance = DEFAULT_TOLERANCE,
}: HitTestDrawingParams): HitTestResult {
  switch (drawing.type) {
    case 'horizontal':
      return hitTestHorizontal(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'vertical':
      return hitTestVertical(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'trend':
      return hitTestTrend(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'rectangle':
      return hitTestRectangle(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'fibonacci':
      return hitTestFibonacci(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'parallel-channel':
      return hitTestParallelChannel(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'ray':
      return hitTestRay(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    case 'arrow':
      return hitTestArrow(drawing, mouseX, mouseY, viewport, width, height, tolerance);
    default:
      return { hit: false, mode: null };
  }
}
