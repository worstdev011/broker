/**
 * useCanvasInfrastructure - ядро FLOW G1
 * 
 * Ответственность:
 * - Инициализация canvas
 * - Работа с DPR (Device Pixel Ratio)
 * - Resize handling
 * - Lifecycle management
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - useState
 * - requestAnimationFrame
 * - Рисование
 * - События мыши
 * - Viewport
 * - Данные
 */

import { useEffect, useRef, RefObject } from 'react';
import { logger } from '@/lib/logger';

interface UseCanvasInfrastructureParams {
  canvasRef: RefObject<HTMLCanvasElement>;
}

/**
 * Очищает весь canvas
 */
function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
}

export function useCanvasInfrastructure({ canvasRef }: UseCanvasInfrastructureParams): void {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Context initialization
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Fail silently - no crash
      logger.warn('Failed to get 2d context for canvas');
      return;
    }

    ctxRef.current = ctx;

    // 2. Device Pixel Ratio handling
    // 🔥 FIX: DPR читается при каждом resize, а не один раз при mount
    // Если пользователь перетащит окно на монитор с другим DPI - canvas адаптируется
    let currentDpr = window.devicePixelRatio || 1;

    /**
     * Получает актуальный DPR (может измениться при перемещении между мониторами)
     */
    const getDpr = (): number => {
      const dpr = window.devicePixelRatio || 1;
      currentDpr = dpr;
      return dpr;
    };

    /**
     * Обновляет размеры canvas с учетом DPR
     * 
     * КРИТИЧЕСКИ ВАЖНО:
     * 1. Сначала устанавливаем CSS-размеры (style.width/height)
     * 2. Потом внутренние размеры (canvas.width/height) = CSS * DPR
     * 3. Без явного CSS-размера браузер сам решает → прыжки при ресайзе
     */
    const updateCanvasSize = () => {
      const dpr = getDpr();
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);

      // Проверяем, что размеры валидны
      if (displayWidth <= 0 || displayHeight <= 0) {
        return;
      }

      // 1. Устанавливаем CSS-размеры (ОБЯЗАТЕЛЬНО!)
      // Без этого браузер сам решает размеры → прыжки при ресайзе
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // 2. Устанавливаем внутренние размеры canvas (с учетом DPR)
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);

      // 3. Масштабируем контекст для Retina
      // Используем setTransform вместо scale, чтобы избежать накопления трансформаций
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 4. Очищаем canvas после изменения размера
      if (ctxRef.current) {
        clearCanvas(ctxRef.current, canvas.width, canvas.height);
      }
    };

    // Первоначальная установка размера
    updateCanvasSize();

    // 3. Resize handling через ResizeObserver
    // ВАЖНО: наблюдаем за родителем, а не за canvas
    // Если наблюдать за canvas → цикл: canvas меняет размер → observer → resize → canvas → observer
    // Используем contentRect наблюдаемого элемента - размеры уже актуальны на момент колбэка
    const parentElement = canvas.parentElement;
    const observerCallback = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;
      const dpr = getDpr();
      const r = entry.contentRect;
      const displayWidth = Math.floor(r.width);
      const displayHeight = Math.floor(r.height);
      if (displayWidth <= 0 || displayHeight <= 0) return;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ctxRef.current) {
        clearCanvas(ctxRef.current, canvas.width, canvas.height);
      }
    };

    if (parentElement) {
      resizeObserverRef.current = new ResizeObserver(observerCallback);
      resizeObserverRef.current.observe(parentElement);
    } else {
      resizeObserverRef.current = new ResizeObserver(() => updateCanvasSize());
      resizeObserverRef.current.observe(canvas);
    }

    // 4. Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Очищаем canvas перед unmount
      if (ctxRef.current && canvas.width > 0 && canvas.height > 0) {
        clearCanvas(ctxRef.current, canvas.width, canvas.height);
      }

      ctxRef.current = null;
    };
  }, [canvasRef]);
}
