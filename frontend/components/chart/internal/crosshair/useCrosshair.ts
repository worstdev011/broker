/**
 * useCrosshair - ядро FLOW G7
 * 
 * Ответственность:
 * - Отслеживание позиции курсора мыши
 * - Вычисление времени и цены под курсором
 * - Управление состоянием crosshair
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - изменение viewport
 * - изменение data
 * - pan / zoom
 * - websocket
 * - useState
 * - бизнес-логика
 */

import { useRef, useEffect, RefObject } from 'react';
import type { Viewport } from '../viewport.types';
import type { CrosshairState } from './crosshair.types';
import { timeToX } from '../utils/coords';

interface UseCrosshairParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  getViewport: () => Viewport | null;
  /** Если задан — время снэпится к центру свечи (магнит к центру свечи) */
  getTimeframeMs?: () => number;
}

interface UseCrosshairReturn {
  getCrosshair: () => CrosshairState | null;
}

/**
 * Конвертирует X координату мыши в время
 */
function mapXToTime(x: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return viewport.timeStart;
  return viewport.timeStart + (x / width) * timeRange;
}

/**
 * Конвертирует Y координату мыши в цену
 */
function mapYToPrice(y: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return viewport.priceMin;
  return viewport.priceMax - (y / height) * priceRange;
}

/**
 * Снэп времени к центру свечи (сетка timeframeMs: центр = bucket + timeframeMs/2)
 */
function snapTimeToCandleCenter(time: number, timeframeMs: number): number {
  const bucket = Math.floor(time / timeframeMs) * timeframeMs;
  return bucket + timeframeMs / 2;
}

export function useCrosshair({
  canvasRef,
  getViewport,
  getTimeframeMs,
}: UseCrosshairParams): UseCrosshairReturn {
  const crosshairRef = useRef<CrosshairState | null>(null);
  // 🔥 FIX #9: Ref для callbacks — handlers стабильны, всегда вызывают актуальные версии
  const callbacksRef = useRef({ getViewport, getTimeframeMs });
  callbacksRef.current = { getViewport, getTimeframeMs };

  const getCrosshair = (): CrosshairState | null => {
    return crosshairRef.current;
  };

  const handleMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { getViewport: gvp, getTimeframeMs: gtf } = callbacksRef.current;
    const viewport = gvp();
    if (!viewport) {
      crosshairRef.current = null;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Получаем размеры canvas (CSS размеры, не внутренние)
    const width = canvas.clientWidth || rect.width;
    const height = canvas.clientHeight || rect.height;

    // Проверяем, что курсор в пределах canvas
    if (x < 0 || x > width || y < 0 || y > height) {
      crosshairRef.current = null;
      return;
    }

    // Константы для областей меток (как в renderAxes.ts)
    const PRICE_LABEL_BG_WIDTH = 60; // Ширина области меток цены справа
    const TIME_LABEL_BG_HEIGHT = 25; // Высота области меток времени внизу

    // Скрываем кроссхейр если курсор находится в области меток цены (справа) или меток времени (внизу)
    if (x >= width - PRICE_LABEL_BG_WIDTH || y >= height - TIME_LABEL_BG_HEIGHT) {
      crosshairRef.current = null;
      return;
    }

    let time = mapXToTime(x, viewport, width);
    const timeframeMs = gtf?.();
    if (timeframeMs != null && timeframeMs > 0) {
      time = snapTimeToCandleCenter(time, timeframeMs);
    }

    const price = mapYToPrice(y, viewport, height);
    const snappedX = (timeframeMs != null && timeframeMs > 0)
      ? timeToX(time, viewport, width)
      : x;

    crosshairRef.current = {
      isActive: true,
      x: snappedX,
      y,
      time,
      price,
    };
  };

  /**
   * Обработчик mouseLeave - скрытие crosshair
   */
  const handleMouseLeave = () => {
    crosshairRef.current = null;
  };

  // Подписка на события мыши
  // 🔥 FLOW TOUCH-CHART: На мобильных кроссхейр не нужен (нет hover)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    if (isTouchDevice) return; // Не подписываемся — getCrosshair всегда вернёт null

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef]);

  return {
    getCrosshair,
  };
}
