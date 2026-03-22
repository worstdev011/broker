/**
 * useChartInteractions - ядро FLOW G5
 * 
 * Ответственность:
 * - Обработка mouse/wheel событий
 * - Pan (drag)
 * - Zoom (wheel)
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - follow mode
 * - WebSocket
 * - render
 * - изменение data layer
 * - useState
 * - side-effects вне хука
 */

import { useEffect, useRef, RefObject } from 'react';
import type React from 'react';
import type { Viewport } from '../viewport.types';
import { InteractionState, type InteractionZone } from './interaction.types';
import { panViewportTime, zoomViewportTime } from './math';
import { getMinVisibleCandlesForZoom } from './zoomBreakpoints';

interface UseChartInteractionsParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewportRef: React.RefObject<Viewport | null>;
  updateViewport: (newViewport: Viewport) => void;
  timeframeMs: number;
  visibleCandles: number;
  onViewportChange?: (viewport: Viewport) => void; // Callback после изменения viewport (для загрузки истории)
  getIsEditingDrawing?: () => boolean; // FLOW G16: Проверка, идет ли редактирование drawing
  getDrawingEditState?: () => { mode: string } | null; // FLOW G16: режим при драге (move / resize-*)
  getHoveredDrawingMode?: () => string | null; // FLOW G16: режим при наведении на drawing
  getIsPointOnDrawing?: (x: number, y: number) => boolean; // FLOW G16-TOUCH: touch на drawing - не начинаем pan
  setFollowMode?: (on: boolean) => void; // 🔥 FLOW F1: Выключение follow при взаимодействии
  // 🔥 FLOW Y1: Y-scale drag API
  beginYScaleDrag?: (startY: number) => void;
  updateYScaleDrag?: (currentY: number) => void;
  endYScaleDrag?: () => void;
  // FLOW A: Price Alerts
  getInteractionZones?: () => InteractionZone[];
  addPriceAlert?: (price: number) => void;
  // 🔥 FLOW C-INERTIA: Pan inertia refs (опционально, если не переданы - создаются внутри)
  panInertiaRefs?: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  };
  // FLOW C-MARKET-ALTERNATIVES: Hitboxes для альтернативных пар
  marketAlternativesHitboxesRef?: React.MutableRefObject<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    instrumentId: string;
  }>>;
  // FLOW C-MARKET-ALTERNATIVES: Callback для переключения инструмента
  onAlternativeClick?: (instrumentId: string) => void;
  // FLOW C-MARKET-ALTERNATIVES: Callback для hover по альтернативной паре
  onAlternativeHover?: (mouseX: number, mouseY: number) => number | null;
  // 🔥 FLOW Y1: Callback для авто-фита Y-шкалы при двойном клике на метки цены
  resetYScale?: () => void;
  // FLOW C-MARKET-CLOSED: блокировка pan/zoom когда рынок закрыт
  getMarketStatus?: () => 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';
  // 🔥 FLOW RETURN-TO-FOLLOW: Callback для планирования возврата в follow mode
  scheduleReturnToFollow?: () => void;
}

const MAX_VISIBLE_CANDLES = 300; // Увеличено для возможности большего zoom out
const ZOOM_SENSITIVITY = 0.1; // 10% за шаг колесика
const PRICE_AXIS_WIDTH = 80; // 🔥 FLOW Y1: Ширина правой оси цены

/**
 * Конвертирует X координату мыши в время
 */
function mouseXToTime(
  mouseX: number,
  canvas: HTMLCanvasElement,
  viewport: Viewport
): number {
  const rect = canvas.getBoundingClientRect();
  const relativeX = mouseX - rect.left;
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const pixelsPerMs = canvas.clientWidth / timeRange;
  return viewport.timeStart + relativeX / pixelsPerMs;
}

/**
 * 🔥 FLOW Y1: Проверяет, находится ли мышь над правой осью цены
 */
function isMouseOnPriceAxis(
  mouseX: number,
  canvas: HTMLCanvasElement
): boolean {
  const rect = canvas.getBoundingClientRect();
  const relativeX = mouseX - rect.left;
  return relativeX > canvas.clientWidth - PRICE_AXIS_WIDTH;
}

interface UseChartInteractionsReturn {
  reset: () => void; // 🔥 FLOW: Timeframe Switch Reset - сброс состояния pan/zoom
  // 🔥 FLOW C-INERTIA: Pan inertia API
  getPanVelocity: () => number;
  getInertiaActive: () => boolean;
  stopInertia: () => void;
  // 🔥 FLOW C-INERTIA: Refs для передачи в useViewport
  panInertiaRefs: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  };
}

export function useChartInteractions({
  canvasRef,
  viewportRef,
  updateViewport,
  timeframeMs,
  visibleCandles,
  onViewportChange,
  getIsEditingDrawing,
  getDrawingEditState,
  getHoveredDrawingMode,
  getIsPointOnDrawing,
  setFollowMode,
  beginYScaleDrag,
  updateYScaleDrag,
  endYScaleDrag,
  getInteractionZones,
  addPriceAlert,
  panInertiaRefs: externalPanInertiaRefs,
  marketAlternativesHitboxesRef,
  onAlternativeClick,
  onAlternativeHover,
  resetYScale,
  getMarketStatus,
  scheduleReturnToFollow,
}: UseChartInteractionsParams): UseChartInteractionsReturn {
  // 🔥 FIX: Ref для актуальных callbacks - handlers стабильны, но всегда вызывают последние версии.
  // Без этого при смене инструмента/таймфрейма handlers используют stale closure (eslint-disable скрывал).
  const handlersRef = useRef({
    updateViewport,
    onViewportChange,
    getIsEditingDrawing,
    getDrawingEditState,
    getHoveredDrawingMode,
    getIsPointOnDrawing,
    setFollowMode,
    beginYScaleDrag,
    updateYScaleDrag,
    endYScaleDrag,
    getInteractionZones,
    addPriceAlert,
    onAlternativeClick,
    onAlternativeHover,
    resetYScale,
    getMarketStatus,
    scheduleReturnToFollow,
    marketAlternativesHitboxesRef,
  });
  handlersRef.current = {
    updateViewport,
    onViewportChange,
    getIsEditingDrawing,
    getDrawingEditState,
    getHoveredDrawingMode,
    getIsPointOnDrawing,
    setFollowMode,
    beginYScaleDrag,
    updateYScaleDrag,
    endYScaleDrag,
    getInteractionZones,
    addPriceAlert,
    onAlternativeClick,
    onAlternativeHover,
    resetYScale,
    getMarketStatus,
    scheduleReturnToFollow,
    marketAlternativesHitboxesRef,
  };

  const interactionStateRef = useRef<InteractionState>({
    isDragging: false,
    lastX: null,
  });
  // 🔥 FLOW Y1: Y-scale drag state
  const yDragStateRef = useRef<boolean>(false);
  // 🔥 FLOW TOUCH-CHART: Touch gesture refs (1 finger = pan, 2 fingers = pinch zoom)
  const touchModeRef = useRef<'none' | 'pan' | 'pinch'>('none');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; centerX: number } | null>(null);
  const internalPanVelocityRef = useRef<number>(0);
  const internalInertiaActiveRef = useRef<boolean>(false);
  const panVelocityPxPerMsRef = externalPanInertiaRefs?.velocityRef || internalPanVelocityRef;
  const inertiaActiveRef = externalPanInertiaRefs?.activeRef || internalInertiaActiveRef;
  const lastMoveTimeRef = useRef<number | null>(null);
  /** Smoothed velocity via EMA for stable inertia starts */
  const emaVelocityRef = useRef<number>(0);
  const EMA_ALPHA = 0.35;

  /**
   * Обработчик mouseDown - начало pan или Y-scale drag
   */
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const h = handlersRef.current;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // FLOW C-MARKET-ALTERNATIVES: Проверяем клик по альтернативным парам
    if (h.marketAlternativesHitboxesRef && h.onAlternativeClick) {
      const hitboxes = h.marketAlternativesHitboxesRef.current;
      for (const box of hitboxes) {
        if (
          x >= box.x &&
          x <= box.x + box.width &&
          y >= box.y &&
          y <= box.y + box.height
        ) {
          h.onAlternativeClick(box.instrumentId);
          return;
        }
      }
    }

    // FLOW C-MARKET-CLOSED: когда рынок закрыт, не начинаем pan (но клики по альтернативным парам уже обработаны выше)
    if (h.getMarketStatus && h.getMarketStatus() !== 'OPEN') return;

    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;
    emaVelocityRef.current = 0;
    lastMoveTimeRef.current = performance.now();

    // FLOW G16: Если идет редактирование drawing, не начинаем pan
    if (h.getIsEditingDrawing?.()) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    // FLOW A3: Проверяем hit‑зоны (например, "+" для price alert)
    const zones = h.getInteractionZones?.() ?? [];
    if (zones.length > 0) {
      for (const zone of zones) {
        if (
          x >= zone.x &&
          x <= zone.x + zone.width &&
          y >= zone.y &&
          y <= zone.y + zone.height
        ) {
          if (zone.type === 'add-alert' && h.addPriceAlert) {
            h.addPriceAlert(zone.price);
          }
          return;
        }
      }
    }

    // 🔥 FLOW Y1: Проверяем, находится ли мышь над правой осью цены
    if (isMouseOnPriceAxis(e.clientX, canvas)) {
      inertiaActiveRef.current = false;
      panVelocityPxPerMsRef.current = 0;
      yDragStateRef.current = true;
      h.beginYScaleDrag?.(y);
      return;
    }

    // Обычный pan
    interactionStateRef.current = {
      isDragging: true,
      lastX: x,
    };
  };

  /**
   * Обработчик mouseMove - pan или Y-scale drag
   */
  const handleMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const h = handlersRef.current;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isOverCanvas =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    // FLOW C-MARKET-ALTERNATIVES: Обрабатываем hover по альтернативным парам
    let isHoveringAlternatives = false;
    if (h.onAlternativeHover && !interactionStateRef.current.isDragging && !yDragStateRef.current && isOverCanvas) {
      isHoveringAlternatives = h.onAlternativeHover(x, y) !== null;
    }

    // FLOW G16: Курсор при редактировании/наведении на drawings
    if (isOverCanvas) {
      const drawingMode =
        (h.getIsEditingDrawing?.() && h.getDrawingEditState?.()?.mode) ?? h.getHoveredDrawingMode?.() ?? null;
      if (drawingMode === 'move' || drawingMode === 'resize-start' || drawingMode === 'resize-end') {
        canvas.style.cursor = 'move';
      } else if (drawingMode === 'resize-offset') {
        canvas.style.cursor = 'ns-resize';
      } else if (drawingMode === 'resize-tl' || drawingMode === 'resize-br') {
        canvas.style.cursor = 'nwse-resize';
      } else if (drawingMode === 'resize-tr' || drawingMode === 'resize-bl') {
        canvas.style.cursor = 'nesw-resize';
      } else if (yDragStateRef.current || isMouseOnPriceAxis(e.clientX, canvas)) {
        canvas.style.cursor = 'ns-resize';
      } else if (isHoveringAlternatives) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      canvas.style.cursor = 'default';
    }

    // 🔥 FLOW Y1: Если идет Y-scale drag
    if (yDragStateRef.current) {
      h.updateYScaleDrag?.(y);
      return;
    }

    const state = interactionStateRef.current;
    if (!state.isDragging || state.lastX === null) return;

    if (h.getIsEditingDrawing?.()) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const currentX = e.clientX - rect.left;
    const deltaX = currentX - state.lastX;

    const now = performance.now();
    const lastTime = lastMoveTimeRef.current;

    if (lastTime !== null) {
      const dt = now - lastTime;
      if (dt > 0) {
        const rawVelocity = deltaX / dt;
        emaVelocityRef.current = EMA_ALPHA * rawVelocity + (1 - EMA_ALPHA) * emaVelocityRef.current;
        panVelocityPxPerMsRef.current = emaVelocityRef.current;
      }
    }

    lastMoveTimeRef.current = now;

    // Вычисляем pixelsPerMs
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const pixelsPerMs = canvas.clientWidth / timeRange;

    // Pan viewport
    const newViewport = panViewportTime({
      viewport,
      deltaX,
      pixelsPerMs,
    });

    h.setFollowMode?.(false);
    h.updateViewport(newViewport);
    h.onViewportChange?.(newViewport);
    interactionStateRef.current.lastX = currentX;
  };

  /**
   * Обработчик mouseUp - конец pan или Y-scale drag
   */
  const handleMouseUp = () => {
    const h = handlersRef.current;
    if (yDragStateRef.current) {
      yDragStateRef.current = false;
      h.endYScaleDrag?.();
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';
      return;
    }

    const velocity = panVelocityPxPerMsRef.current;
    if (Math.abs(velocity) > 0.05) {
      inertiaActiveRef.current = true;
      h.setFollowMode?.(false);
    } else {
      inertiaActiveRef.current = false;
      panVelocityPxPerMsRef.current = 0;
    }
    h.scheduleReturnToFollow?.();

    interactionStateRef.current = {
      ...interactionStateRef.current,
      isDragging: false,
      lastX: null,
    };
  };

  /**
   * Обработчик wheel - zoom
   */
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const h = handlersRef.current;
    if (h.getMarketStatus?.() !== 'OPEN') return;

    // 🔥 FLOW C-INERTIA: Прерываем инерцию при zoom
    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;

    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    // Определяем направление зума
    // deltaY > 0 = скролл вниз = zoom out (уменьшение) → zoomFactor > 1
    // deltaY < 0 = скролл вверх = zoom in (увеличение) → zoomFactor < 1
    // В zoomViewportTime: newTimeRange = currentTimeRange * zoomFactor
    // zoomFactor > 1 → увеличиваем диапазон → уменьшаем масштаб (zoom out)
    // zoomFactor < 1 → уменьшаем диапазон → увеличиваем масштаб (zoom in)
    // ИНВЕРТИРУЕМ: скролл вверх (deltaY < 0) = увеличение масштаба (zoomFactor < 1)
    //              скролл вниз (deltaY > 0) = уменьшение масштаба (zoomFactor > 1)
    const zoomFactor = e.deltaY < 0 ? 1 - ZOOM_SENSITIVITY : 1 + ZOOM_SENSITIVITY;

    // Получаем время в точке курсора
    const anchorTime = mouseXToTime(e.clientX, canvas, viewport);

    const newViewport = zoomViewportTime({
      viewport,
      zoomFactor,
      anchorTime,
      minVisibleCandles: getMinVisibleCandlesForZoom(),
      maxVisibleCandles: MAX_VISIBLE_CANDLES,
      timeframeMs,
    });

    h.setFollowMode?.(false);
    h.updateViewport(newViewport);
    h.onViewportChange?.(newViewport);
  };

  const handleMouseLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
  };

  /**
   * Обработчик двойного клика - авто-фит Y-шкалы при клике на метки цены
   */
  const handleDoubleClick = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    const resetYScale = handlersRef.current.resetYScale;
    if (!canvas || !resetYScale) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = canvas.clientWidth || rect.width;
    const PRICE_LABEL_BG_WIDTH = 60;
    if (x >= width - PRICE_LABEL_BG_WIDTH) {
      resetYScale();
    }
  };

  // 🔥 FLOW TOUCH-CHART: Touch helpers
  const getTouchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const getTouchCenterX = (t1: Touch, t2: Touch) => (t1.clientX + t2.clientX) / 2;

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const h = handlersRef.current;
    if (h.getMarketStatus?.() !== 'OPEN') return;
    if (h.getIsEditingDrawing?.()) return;

    if (e.touches.length === 1) {
      const canvasEl = canvasRef.current;
      const rect = canvasEl?.getBoundingClientRect();
      if (rect && h.getIsPointOnDrawing) {
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        if (h.getIsPointOnDrawing(x, y)) return;
      }
      touchModeRef.current = 'pan';
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      inertiaActiveRef.current = false;
      panVelocityPxPerMsRef.current = 0;
      emaVelocityRef.current = 0;
      lastMoveTimeRef.current = performance.now();
    } else if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      touchModeRef.current = 'pinch';
      pinchStartRef.current = {
        distance: getTouchDistance(t1, t2),
        centerX: getTouchCenterX(t1, t2),
      };
      inertiaActiveRef.current = false;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = canvas.getBoundingClientRect();
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const pixelsPerMs = canvas.clientWidth / timeRange;

    if (touchModeRef.current === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const start = touchStartRef.current;
      if (!start) return;

      const deltaX = t.clientX - start.x;

      const now = performance.now();
      const lastTime = lastMoveTimeRef.current;
      if (lastTime !== null) {
        const dt = now - lastTime;
        if (dt > 0) {
          const rawVelocity = deltaX / dt;
          emaVelocityRef.current = EMA_ALPHA * rawVelocity + (1 - EMA_ALPHA) * emaVelocityRef.current;
          panVelocityPxPerMsRef.current = emaVelocityRef.current;
        }
      }
      lastMoveTimeRef.current = now;

      const newViewport = panViewportTime({
        viewport,
        deltaX,
        pixelsPerMs,
      });

      const h = handlersRef.current;
      h.setFollowMode?.(false);
      h.updateViewport(newViewport);
      h.onViewportChange?.(newViewport);

      touchStartRef.current = { x: t.clientX, y: t.clientY };
    } else if (touchModeRef.current === 'pinch' && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const pinch = pinchStartRef.current;
      if (!pinch) return;

      const newDistance = getTouchDistance(t1, t2);
      // Инвертировано: разведение пальцев = zoom in, сведение = zoom out (как на линейном графике)
      const zoomFactor = pinch.distance / newDistance;
      const anchorTime = mouseXToTime(pinch.centerX, canvas, viewport);

      const newViewport = zoomViewportTime({
        viewport,
        zoomFactor,
        anchorTime,
        minVisibleCandles: getMinVisibleCandlesForZoom(),
        maxVisibleCandles: MAX_VISIBLE_CANDLES,
        timeframeMs,
      });

      const h = handlersRef.current;
      h.setFollowMode?.(false);
      h.updateViewport(newViewport);
      h.onViewportChange?.(newViewport);

      pinchStartRef.current = {
        distance: newDistance,
        centerX: getTouchCenterX(t1, t2),
      };
    }
  };

  const handleTouchEnd = () => {
    if (touchModeRef.current === 'pan') {
      const h = handlersRef.current;
      const velocity = panVelocityPxPerMsRef.current;
      if (Math.abs(velocity) > 0.05) {
        inertiaActiveRef.current = true;
        h.setFollowMode?.(false);
      } else {
        inertiaActiveRef.current = false;
        panVelocityPxPerMsRef.current = 0;
      }
      h.scheduleReturnToFollow?.();
    }
    touchModeRef.current = 'none';
    touchStartRef.current = null;
    pinchStartRef.current = null;
  };

  // Подписка на события
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // 🔥 FLOW TOUCH-CHART: Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [canvasRef]); // handlersRef обновляется каждый рендер - handlers всегда вызывают актуальные callbacks

  /**
   * 🔥 FLOW: Timeframe Switch Reset - сброс состояния pan/zoom
   * Сбрасывает состояние взаимодействий при смене timeframe
   */
  const reset = (): void => {
    // Сбрасываем состояние pan (прерываем активный drag если есть)
    interactionStateRef.current = {
      isDragging: false,
      lastX: null,
    };

    // 🔥 FLOW TOUCH-CHART: Сбрасываем touch состояние
    touchModeRef.current = 'none';
    touchStartRef.current = null;
    pinchStartRef.current = null;
    
    yDragStateRef.current = false;
    handlersRef.current.endYScaleDrag?.();

    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;
    emaVelocityRef.current = 0;
    lastMoveTimeRef.current = null;
  };

  // 🔥 FLOW C-INERTIA: Методы для доступа к состоянию инерции
  const getPanVelocity = (): number => {
    return panVelocityPxPerMsRef.current;
  };

  const getInertiaActive = (): boolean => {
    return inertiaActiveRef.current;
  };

  const stopInertia = (): void => {
    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;
  };

  return {
    reset,
    getPanVelocity,
    getInertiaActive,
    stopInertia,
    panInertiaRefs: {
      velocityRef: panVelocityPxPerMsRef,
      activeRef: inertiaActiveRef,
    },
  };
}
