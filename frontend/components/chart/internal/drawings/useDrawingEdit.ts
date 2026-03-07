/**
 * useDrawingEdit - редактирование и перетаскивание drawings
 * 
 * FLOW G16: Drawing edit & drag
 * 
 * Ответственность:
 * - Hover detection
 * - Selection
 * - Drag (перемещение)
 * - Resize (для trend)
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - useState
 * - мутация viewport
 * - влияние на candles
 */

import { useEffect, useRef, RefObject } from 'react';
import type { Viewport } from '../viewport.types';
import type { Drawing, DrawingEditState, DrawingEditMode } from './drawing.types';
import { hitTestDrawing } from './drawing.hitTest';

interface UseDrawingEditParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  getViewport: () => Viewport | null;
  getDrawings: () => Drawing[];
  updateDrawing: (id: string, nextDrawing: Drawing) => void;
  onHoverChange?: (drawingId: string | null, mode: DrawingEditMode | null) => void;
  onEditStateChange?: (editState: DrawingEditState | null) => void;
  getIsEditing?: () => boolean; // FLOW G16: Функция для проверки, идет ли редактирование
  /** FLOW G16-TOUCH: Проверка попадания точки в drawing (для пропуска pan на мобилке) */
  onRegisterHitTest?: (fn: (x: number, y: number) => boolean) => void;
}

/**
 * Конвертирует delta X в delta time
 */
function deltaXToDeltaTime(deltaX: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return (deltaX / width) * timeRange;
}

/**
 * Конвертирует delta Y в delta price
 */
function deltaYToDeltaPrice(deltaY: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return 0;
  // Y растет вниз, price растет вверх, поэтому инвертируем
  return -(deltaY / height) * priceRange;
}

export function useDrawingEdit({
  canvasRef,
  getViewport,
  getDrawings,
  updateDrawing,
  onHoverChange,
  onEditStateChange,
  getIsEditing,
  onRegisterHitTest,
}: UseDrawingEditParams): void {
  const editStateRef = useRef<DrawingEditState | null>(null);
  const hoveredDrawingIdRef = useRef<string | null>(null);
  const hoveredDrawingModeRef = useRef<DrawingEditMode | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const activeTouchIdRef = useRef<number | null>(null); // FLOW G16-TOUCH: отслеживаем touch для drag

  // FLOW G16-TOUCH: Регистрируем hit test для useChartInteractions (пропуск pan при touch на drawing)
  useEffect(() => {
    const hitTestAtPoint = (mouseX: number, mouseY: number): boolean => {
      const viewport = getViewport();
      const drawings = getDrawings();
      if (!viewport || !canvasRef.current) return false;
      const canvas = canvasRef.current;
      const width = canvas.clientWidth || canvas.width;
      const height = canvas.clientHeight || canvas.height;
      for (let i = drawings.length - 1; i >= 0; i--) {
        const hitTest = hitTestDrawing({ drawing: drawings[i], mouseX, mouseY, viewport, width, height });
        if (hitTest.hit && hitTest.mode) return true;
      }
      return false;
    };
    onRegisterHitTest?.(hitTestAtPoint);
    return () => onRegisterHitTest?.(() => false);
  }, [onRegisterHitTest, getViewport, getDrawings]);

  // Обновляем callbacks при изменении edit state
  useEffect(() => {
    if (onEditStateChange) {
      onEditStateChange(editStateRef.current);
    }
  }, [onEditStateChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const viewport = getViewport();
      if (!viewport) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const width = canvas.clientWidth || canvas.width;
      const height = canvas.clientHeight || canvas.height;

      // Проверяем, что курсор в пределах canvas
      if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
        if (!isDraggingRef.current) {
          hoveredDrawingIdRef.current = null;
          hoveredDrawingModeRef.current = null;
          if (onHoverChange) {
            onHoverChange(null, null);
          }
        }
        return;
      }

      // Если в режиме редактирования - обновляем drawing
      if (editStateRef.current && isDraggingRef.current) {
        const editState = editStateRef.current;
        const drawings = getDrawings();
        const drawing = drawings.find(d => d.id === editState.drawingId);
        
        if (!drawing) {
          // Drawing был удален, сбрасываем edit state
          editStateRef.current = null;
          isDraggingRef.current = false;
          if (onEditStateChange) {
            onEditStateChange(null);
          }
          return;
        }

        const deltaX = mouseX - editState.startMouse.x;
        const deltaY = mouseY - editState.startMouse.y;

        let nextDrawing: Drawing;

        if (drawing.type === 'horizontal') {
          // Горизонтальная линия: двигаем по Y (price)
          const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
          const startPrice = (editState.startData as typeof drawing).price;
          nextDrawing = {
            ...drawing,
            price: startPrice + deltaPrice,
          };
        } else if (drawing.type === 'vertical') {
          // Вертикальная линия: двигаем по X (time)
          const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
          const startTime = (editState.startData as typeof drawing).time;
          nextDrawing = {
            ...drawing,
            time: startTime + deltaTime,
          };
        } else if (drawing.type === 'trend') {
          // Trend line
          const startData = editState.startData as typeof drawing;
          
          if (editState.mode === 'move') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-start') {
            // Изменяем только start
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-end') {
            // Изменяем только end
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            
            nextDrawing = {
              ...drawing,
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else {
            nextDrawing = drawing;
          }
        } else if (drawing.type === 'arrow') {
          const startData = editState.startData as typeof drawing;
          if (editState.mode === 'move') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-start') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-end') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else {
            nextDrawing = drawing;
          }
        } else if (drawing.type === 'fibonacci') {
          const startData = editState.startData as typeof drawing;
          if (editState.mode === 'move') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-start') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-end') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else {
            nextDrawing = drawing;
          }
        } else if (drawing.type === 'ray') {
          const startData = editState.startData as typeof drawing;
          if (editState.mode === 'move') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-start') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-end') {
            const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
            const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
            nextDrawing = {
              ...drawing,
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else {
            nextDrawing = drawing;
          }
        } else if (drawing.type === 'parallel-channel') {
          const startData = editState.startData as typeof drawing;
          const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
          const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
          if (editState.mode === 'move') {
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-start') {
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-end') {
            nextDrawing = {
              ...drawing,
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-offset') {
            nextDrawing = {
              ...drawing,
              offset: startData.offset + deltaPrice,
            };
          } else {
            nextDrawing = drawing;
          }
        } else if (drawing.type === 'rectangle') {
          const startData = editState.startData as typeof drawing;
          const deltaTime = deltaXToDeltaTime(deltaX, viewport, width);
          const deltaPrice = deltaYToDeltaPrice(deltaY, viewport, height);
          const minT = Math.min(startData.start.time, startData.end.time);
          const maxT = Math.max(startData.start.time, startData.end.time);
          const minP = Math.min(startData.start.price, startData.end.price);
          const maxP = Math.max(startData.start.price, startData.end.price);

          if (editState.mode === 'move') {
            nextDrawing = {
              ...drawing,
              start: {
                time: startData.start.time + deltaTime,
                price: startData.start.price + deltaPrice,
              },
              end: {
                time: startData.end.time + deltaTime,
                price: startData.end.price + deltaPrice,
              },
            };
          } else if (editState.mode === 'resize-tl') {
            const newT = Math.min(minT + deltaTime, maxT - 1);
            const newP = Math.max(maxP + deltaPrice, minP + 0.00001);
            nextDrawing = {
              ...drawing,
              start: { time: newT, price: newP },
              end: { time: maxT, price: minP },
            };
          } else if (editState.mode === 'resize-tr') {
            const newT = Math.max(maxT + deltaTime, minT + 1);
            const newP = Math.max(maxP + deltaPrice, minP + 0.00001);
            nextDrawing = {
              ...drawing,
              start: { time: minT, price: newP },
              end: { time: newT, price: minP },
            };
          } else if (editState.mode === 'resize-bl') {
            const newT = Math.min(minT + deltaTime, maxT - 1);
            const newP = Math.min(minP + deltaPrice, maxP - 0.00001);
            nextDrawing = {
              ...drawing,
              start: { time: newT, price: maxP },
              end: { time: maxT, price: newP },
            };
          } else if (editState.mode === 'resize-br') {
            const newT = Math.max(maxT + deltaTime, minT + 1);
            const newP = Math.min(minP + deltaPrice, maxP - 0.00001);
            nextDrawing = {
              ...drawing,
              start: { time: minT, price: maxP },
              end: { time: newT, price: newP },
            };
          } else {
            nextDrawing = drawing;
          }
        } else {
          nextDrawing = drawing;
        }

        updateDrawing(editState.drawingId, nextDrawing);
        return;
      }

      // Если не в режиме редактирования - проверяем hover
      const drawings = getDrawings();
      
      // Проверяем drawings в обратном порядке (последние созданные сверху)
      let newHoveredId: string | null = null;
      let newHoveredMode: DrawingEditMode | null = null;

      for (let i = drawings.length - 1; i >= 0; i--) {
        const drawing = drawings[i];
        const hitTest = hitTestDrawing({
          drawing,
          mouseX,
          mouseY,
          viewport,
          width,
          height,
        });

        if (hitTest.hit && hitTest.mode) {
          newHoveredId = drawing.id;
          newHoveredMode = hitTest.mode;
          break;
        }
      }

      if (
        newHoveredId !== hoveredDrawingIdRef.current ||
        newHoveredMode !== hoveredDrawingModeRef.current
      ) {
        hoveredDrawingIdRef.current = newHoveredId;
        hoveredDrawingModeRef.current = newHoveredMode;
        if (onHoverChange) {
          onHoverChange(newHoveredId, newHoveredMode);
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const viewport = getViewport();
      if (!viewport) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const width = canvas.clientWidth || canvas.width;
      const height = canvas.clientHeight || canvas.height;

      // Проверяем, что клик в пределах canvas
      if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
        return;
      }

      // Если уже в режиме редактирования, не начинаем новый
      if (editStateRef.current) {
        return;
      }

      // Проверяем hit test
      const drawings = getDrawings();
      
      for (let i = drawings.length - 1; i >= 0; i--) {
        const drawing = drawings[i];
        const hitTest = hitTestDrawing({
          drawing,
          mouseX,
          mouseY,
          viewport,
          width,
          height,
        });

        if (hitTest.hit && hitTest.mode) {
          // Начинаем редактирование
          editStateRef.current = {
            drawingId: drawing.id,
            mode: hitTest.mode,
            startMouse: { x: mouseX, y: mouseY },
            startData: { ...drawing }, // snapshot
          };
          isDraggingRef.current = true;
          
          // FLOW G16: Предотвращаем распространение события, чтобы pan не сработал
          e.stopPropagation();
          
          if (onEditStateChange) {
            onEditStateChange(editStateRef.current);
          }
          break;
        }
      }
    };

    const handleMouseUp = () => {
      if (editStateRef.current) {
        editStateRef.current = null;
        isDraggingRef.current = false;
        
        if (onEditStateChange) {
          onEditStateChange(null);
        }
      }
    };

    const handleMouseLeave = () => {
      if (!isDraggingRef.current) {
        hoveredDrawingIdRef.current = null;
        hoveredDrawingModeRef.current = null;
        if (onHoverChange) {
          onHoverChange(null, null);
        }
      }
    };

    // FLOW G16-TOUCH: Touch handlers для мобилки (move/resize drawings)
    const getCoordsFromTouch = (t: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const viewport = getViewport();
      if (!viewport) return;

      const t = e.touches[0];
      const { x: mouseX, y: mouseY } = getCoordsFromTouch(t);
      const width = canvas.clientWidth || canvas.width;
      const height = canvas.clientHeight || canvas.height;

      if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
      if (editStateRef.current) return;

      const drawings = getDrawings();
      for (let i = drawings.length - 1; i >= 0; i--) {
        const drawing = drawings[i];
        const hitTest = hitTestDrawing({ drawing, mouseX, mouseY, viewport, width, height });
        if (hitTest.hit && hitTest.mode) {
          activeTouchIdRef.current = t.identifier;
          editStateRef.current = {
            drawingId: drawing.id,
            mode: hitTest.mode,
            startMouse: { x: mouseX, y: mouseY },
            startData: { ...drawing },
          };
          isDraggingRef.current = true;
          e.preventDefault();
          onEditStateChange?.(editStateRef.current);
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (activeTouchIdRef.current == null || !editStateRef.current) return;
      const t = Array.from(e.touches).find((x) => x.identifier === activeTouchIdRef.current);
      if (!t) return;

      e.preventDefault();
      handleMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouchIdRef.current == null) return;
      const released = Array.from(e.changedTouches || []).find((x) => x.identifier === activeTouchIdRef.current);
      if (released || e.touches.length === 0) {
        activeTouchIdRef.current = null;
        handleMouseUp();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [canvasRef, getViewport, getDrawings, updateDrawing, onHoverChange, onEditStateChange]);
}
