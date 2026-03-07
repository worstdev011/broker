/**
 * LineChart - компонент линейного графика на тиках
 * 
 * FLOW LINE: Linear Tick Chart (Quotex-style)
 */

'use client';

import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { useLineChart } from './useLineChart';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { dismissToastByKey, showTradeOpenToast, showTradeCloseToast } from '@/stores/toast.store';
import { api } from '@/lib/api/api';
import type { IndicatorConfig } from '../internal/indicators/indicator.types';
import type { OverlayRegistryParams } from '../useChart';

interface LineChartProps {
  className?: string;
  style?: React.CSSProperties;
  instrument?: string;
  payoutPercent?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  digits?: number;
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  indicatorConfigs?: IndicatorConfig[];
  overlayRegistry?: OverlayRegistryParams;
  onReady?: () => void;
}

export interface LineChartRef {
  // Методы для управления графиком (если понадобятся в будущем)
  reset: () => void;
  zoom: (factor: number) => void;
  pan: (deltaMs: number) => void;
  resetFollow: () => void;
  /** FLOW E1: управление временем экспирации (через ref, не state) */
  setExpirationSeconds: (seconds: number) => void;
  /** FLOW T-OVERLAY: добавить overlay по Trade DTO (HTTP) */
  addTradeOverlayFromDTO: (trade: {
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
  }) => void;
  /** FLOW T-OVERLAY: удалить trade по id */
  removeTrade: (id: string) => void;
  /** FLOW G14: удалить drawing по id */
  removeDrawing: (id: string) => void;
  /** FLOW G14: получить все drawings */
  getDrawings: () => import('../internal/drawings/drawing.types').Drawing[];
  /** FLOW G14: добавить drawing */
  addDrawing: (drawing: import('../internal/drawings/drawing.types').Drawing) => void;
  /** FLOW G14: очистить все drawings */
  clearDrawings: () => void;
  /** FLOW LP-3: инициализация из snapshot */
  initializeFromSnapshot: (snapshot: {
    points: Array<{ time: number; price: number }>;
    currentPrice: number;
    serverTime: number;
  }) => void;
  /** FLOW LP-5: добавить исторические точки в начало (для infinite scroll) */
  prependHistory: (points: Array<{ time: number; price: number }>) => void;
  /** FLOW BO-HOVER: установить hover action (CALL/PUT/null) */
  setHoverAction: (action: 'CALL' | 'PUT' | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  shouldShowReturnToLatest: () => boolean;
  followLatest: () => void;
}

export const LineChart = forwardRef<LineChartRef, LineChartProps>(
  ({ className, style, instrument, payoutPercent = 75, activeInstrumentRef, digits, drawingMode, indicatorConfigs, overlayRegistry, onReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // 🔥 FLOW C-INERTIA: Создаем refs для pan инерции (используются в LineChart.tsx и useLineChart)
    const panVelocityPxPerMsRef = useRef<number>(0);
    const panInertiaActiveRef = useRef<boolean>(false);
    const panInertiaRefs = {
      velocityRef: panVelocityPxPerMsRef,
      activeRef: panInertiaActiveRef,
    };

    const lineChart = useLineChart({
      canvasRef,
      enabled: true,
      digits,
      payoutPercent,
      instrument,
      drawingMode,
      indicatorConfigs,
      overlayRegistry,
    });

    // 🔥 FLOW C-INERTIA: Передаем refs в useLineChart для advancePanInertia
    useEffect(() => {
      lineChart.setPanInertiaRefs(panInertiaRefs);
    }, [lineChart, panInertiaRefs]);

    // Интеграция с WebSocket
    useWebSocket({
      activeInstrumentRef,
      onPriceUpdate: lineChart.handlePriceUpdate,
      onServerTime: lineChart.handleServerTime,
      onTradeOpen: (data) => showTradeOpenToast(data),
      onTradeClose: (data) => {
        lineChart.removeTrade(data.id);
        dismissToastByKey(data.id);
        showTradeCloseToast(data);
      },
      enabled: true,
    });

    // Экспонируем методы через ref
    useImperativeHandle(ref, () => ({
      reset: lineChart.reset,
      zoom: lineChart.zoom,
      pan: lineChart.pan,
      resetFollow: lineChart.resetFollow,
      setExpirationSeconds: lineChart.setExpirationSeconds,
      addTradeOverlayFromDTO: lineChart.addTradeOverlayFromDTO,
      removeTrade: lineChart.removeTrade,
      removeDrawing: lineChart.removeDrawing,
      getDrawings: lineChart.getDrawings,
      addDrawing: lineChart.addDrawing,
      clearDrawings: lineChart.clearDrawings,
      initializeFromSnapshot: lineChart.initializeFromSnapshot,
      prependHistory: lineChart.prependHistory,
      setHoverAction: lineChart.setHoverAction,
      zoomIn: lineChart.zoomInAnimated,
      zoomOut: lineChart.zoomOutAnimated,
      shouldShowReturnToLatest: () => !lineChart.getViewport().autoFollow,
      followLatest: lineChart.resetFollow,
    }));

    // FLOW LP-3: Загрузка snapshot при монтировании и смене инструмента
    // 🔥 FLOW C-CHART-TYPE-RESET: Перезагружаем snapshot при монтировании (включая смену chartType)
    // При смене chartType компонент полностью пересоздается через key, поэтому этот useEffect
    // срабатывает заново и загружает свежий snapshot (как F5)
    const isLoadingSnapshotRef = useRef(false);
    const lastLoadedInstrumentRef = useRef<string | null>(null);
    const lineChartRef = useRef(lineChart);
    
    // Обновляем ref при изменении lineChart
    useEffect(() => {
      lineChartRef.current = lineChart;
    }, [lineChart]);
    
    useEffect(() => {
      if (!instrument) return;
      
      // Предотвращаем повторные запросы для того же инструмента
      if (isLoadingSnapshotRef.current || lastLoadedInstrumentRef.current === instrument) {
        return;
      }
      
      isLoadingSnapshotRef.current = true;
      lastLoadedInstrumentRef.current = instrument;
      
      // 🔥 FLOW C-CHART-TYPE-RESET: Очищаем данные перед загрузкой нового snapshot
      // Это гарантирует, что старые данные не останутся при переключении типа графика
      lineChartRef.current.reset();
      
      const loadSnapshot = async () => {
        try {
          const snapshot = await api<{
            points: Array<{ time: number; price: number }>;
            currentPrice: number;
            serverTime: number;
          }>(`/api/line/snapshot?symbol=${instrument}`);
          lineChartRef.current.initializeFromSnapshot(snapshot);
          onReady?.();
        } catch (error) {
          console.error('[LineChart] Error loading snapshot:', error);
          lastLoadedInstrumentRef.current = null;
        } finally {
          isLoadingSnapshotRef.current = false;
        }
      };
      
      loadSnapshot();
    }, [instrument]); // Только instrument в зависимостях, lineChart через ref

    const isLoadingHistoryRef = useRef(false);
    const lastHistoryEdgeRef = useRef<number>(0);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !instrument) return;

      const checkScroll = () => {
        if (isLoadingHistoryRef.current) return;
        
        const viewport = lineChartRef.current.getViewport();
        const points = lineChartRef.current.getPoints();
        const firstPoint = points?.[0];
        
        if (!firstPoint) return;

        const timeRange = viewport.timeEnd - viewport.timeStart;
        const threshold = timeRange * 0.2;
        
        if (viewport.timeStart - firstPoint.time < threshold && firstPoint.time !== lastHistoryEdgeRef.current) {
          isLoadingHistoryRef.current = true;
          lastHistoryEdgeRef.current = firstPoint.time;
          
          const loadHistory = async () => {
            try {
              const { points: historyPoints } = await api<{
                points: Array<{ time: number; price: number }>;
              }>(`/api/line/history?symbol=${instrument}&to=${firstPoint.time}&limit=300`);
              
              if (historyPoints.length > 0) {
                lineChartRef.current.prependHistory(historyPoints);
              }
            } catch (error) {
              console.error('[LineChart] Error loading history:', error);
              lastHistoryEdgeRef.current = 0;
            } finally {
              isLoadingHistoryRef.current = false;
            }
          };
          
          loadHistory();
        }
      };

      const interval = setInterval(checkScroll, 500);
      return () => clearInterval(interval);
    }, [instrument]);

    const handleDoubleClickFn = () => {
      panInertiaRefs.activeRef.current = false;
      panInertiaRefs.velocityRef.current = 0;
      lineChartForEventsRef.current.resetFollow();
    };

    // (handleDoubleClick is registered natively below)

    // Обработка pan (перетаскивание мышью) - используем нативные события как в свечном графике
    const isPanningRef = useRef(false);
    const lastPanXRef = useRef<number | null>(null);
    // 🔥 FLOW C-INERTIA: Pan inertia state для линейного графика (используем refs из panInertiaRefs)
    const lastMoveTimeRef = useRef<number | null>(null);
    const emaVelocityRef = useRef<number>(0);

    // 🔥 FLOW TOUCH-CHART: Touch gesture refs (1 finger = pan, 2 fingers = pinch zoom)
    const touchModeRef = useRef<'none' | 'pan' | 'pinch'>('none');
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const pinchStartRef = useRef<{ distance: number; centerX: number } | null>(null);

    const getTouchDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const getTouchCenterX = (t1: Touch, t2: Touch) => (t1.clientX + t2.clientX) / 2;

    // 🔥 FIX #10: Используем ref для lineChart в event handlers — избегаем пересоздания listeners каждый рендер
    const lineChartForEventsRef = useRef(lineChart);
    lineChartForEventsRef.current = lineChart;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        panInertiaRefs.activeRef.current = false;
        panInertiaRefs.velocityRef.current = 0;
        const rect = canvas.getBoundingClientRect();
        const anchorRatio = (e.clientX - rect.left) / rect.width;
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        lineChartForEventsRef.current.zoomAt(delta, anchorRatio);
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        
        if (lineChartForEventsRef.current.getIsEditingDrawing()) {
          return;
        }
        
        panInertiaRefs.activeRef.current = false;
        panInertiaRefs.velocityRef.current = 0;
        lastMoveTimeRef.current = null;
        emaVelocityRef.current = 0;
        
        e.preventDefault();
        isPanningRef.current = true;
        canvas.style.cursor = 'grabbing';
        const rect = canvas.getBoundingClientRect();
        lastPanXRef.current = e.clientX - rect.left;
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isPanningRef.current || lastPanXRef.current === null) return;

        // FLOW G16: Прерываем pan, если началось редактирование drawing
        if (lineChartForEventsRef.current.getIsEditingDrawing()) {
          isPanningRef.current = false;
          lastPanXRef.current = null;
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const deltaX = currentX - lastPanXRef.current;

        // 🔥 FLOW C-INERTIA: Собираем скорость движения мыши
        const now = performance.now();
        const lastTime = lastMoveTimeRef.current;

        if (lastTime !== null) {
          const dt = now - lastTime;
          if (dt > 0) {
            const EMA_ALPHA = 0.35;
            const rawVelocity = deltaX / dt;
            emaVelocityRef.current = EMA_ALPHA * rawVelocity + (1 - EMA_ALPHA) * emaVelocityRef.current;
            panInertiaRefs.velocityRef.current = emaVelocityRef.current;
          }
        }

        lastMoveTimeRef.current = now;

        const viewport = lineChartForEventsRef.current.getViewport();
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const width = canvas.getBoundingClientRect().width;
        
        // Вычисляем deltaMs (пиксели → миллисекунды)
        const pixelsPerMs = width / timeRange;
        const deltaMs = -deltaX / pixelsPerMs; // Инвертируем для интуитивного pan

        lineChartForEventsRef.current.pan(deltaMs);
        lastPanXRef.current = currentX;
      };

      const handleMouseUp = () => {
        // 🔥 FLOW C-INERTIA: Запускаем инерцию, если скорость выше порога
        const velocity = panInertiaRefs.velocityRef.current;
        if (Math.abs(velocity) > 0.05) {
          // Порог 0.05 px/ms ≈ правильный UX-порог (ниже — незаметно)
          panInertiaRefs.activeRef.current = true;
          lineChartForEventsRef.current.setAutoFollow(false); // Выключаем auto-follow при инерции
          // Return-to-follow будет запланирован когда инерция остановится
        } else {
          // Если скорость слишком мала, останавливаем инерцию
          panInertiaRefs.activeRef.current = false;
          panInertiaRefs.velocityRef.current = 0;
          // 🔥 FLOW RETURN-TO-FOLLOW: Планируем возврат сразу (нет инерции)
          lineChartForEventsRef.current.scheduleReturnToFollow();
        }

        isPanningRef.current = false;
        lastPanXRef.current = null;
        if (canvas) canvas.style.cursor = '';
      };

      const handleMouseLeave = () => {
        isPanningRef.current = false;
        lastPanXRef.current = null;
        canvas.style.cursor = '';
      };

      // 🔥 FLOW TOUCH-CHART: Touch handlers (1 finger = pan, 2 fingers = pinch zoom)
      const handleTouchStart = (e: TouchEvent) => {
        if (lineChartForEventsRef.current.getIsEditingDrawing()) return;
        e.preventDefault();

        if (e.touches.length === 1) {
          // FLOW G16-TOUCH: если touch на drawing — не начинаем pan
          const rect = canvas.getBoundingClientRect();
          const x = e.touches[0].clientX - rect.left;
          const y = e.touches[0].clientY - rect.top;
          if (lineChartForEventsRef.current.getIsPointOnDrawing?.(x, y)) return;

          touchModeRef.current = 'pan';
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          panInertiaRefs.activeRef.current = false;
          panInertiaRefs.velocityRef.current = 0;
          emaVelocityRef.current = 0;
          lastMoveTimeRef.current = null;
        } else if (e.touches.length === 2) {
          const [t1, t2] = [e.touches[0], e.touches[1]];
          touchModeRef.current = 'pinch';
          pinchStartRef.current = {
            distance: getTouchDistance(t1, t2),
            centerX: getTouchCenterX(t1, t2),
          };
          panInertiaRefs.activeRef.current = false;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        const rect = canvasEl.getBoundingClientRect();
        const width = rect.width;
        const viewport = lineChartForEventsRef.current.getViewport();
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const pxPerMs = width / timeRange;

        if (touchModeRef.current === 'pan' && e.touches.length === 1) {
          const t = e.touches[0];
          const start = touchStartRef.current;
          if (!start) return;

          const dx = t.clientX - start.x;
          const deltaMs = -dx / pxPerMs;
          lineChartForEventsRef.current.pan(deltaMs);

          const now = performance.now();
          const lastTime = lastMoveTimeRef.current;
          if (lastTime !== null) {
            const dtMs = now - lastTime;
            if (dtMs > 0) {
              const EMA_ALPHA = 0.35;
              const rawVelocity = dx / dtMs;
              emaVelocityRef.current = EMA_ALPHA * rawVelocity + (1 - EMA_ALPHA) * emaVelocityRef.current;
              panInertiaRefs.velocityRef.current = emaVelocityRef.current;
            }
          }
          lastMoveTimeRef.current = now;

          touchStartRef.current = { x: t.clientX, y: t.clientY };
        } else if (touchModeRef.current === 'pinch' && e.touches.length === 2) {
          const [t1, t2] = [e.touches[0], e.touches[1]];
          const pinch = pinchStartRef.current;
          if (!pinch) return;

          const newDistance = getTouchDistance(t1, t2);
          const zoomFactor = newDistance / pinch.distance;
          const pinchCenterX = getTouchCenterX(t1, t2);
          const anchorRatio = width > 0 ? (pinchCenterX - rect.left) / width : 0.5;
          lineChartForEventsRef.current.zoomAt(zoomFactor, Math.max(0, Math.min(1, anchorRatio)));

          pinchStartRef.current = {
            distance: newDistance,
            centerX: pinchCenterX,
          };
        }
      };

      const handleTouchEnd = () => {
        if (touchModeRef.current === 'pan') {
          const velocity = panInertiaRefs.velocityRef.current;
          if (Math.abs(velocity) > 0.05) {
            panInertiaRefs.activeRef.current = true;
            lineChartForEventsRef.current.setAutoFollow(false);
          } else {
            panInertiaRefs.activeRef.current = false;
            panInertiaRefs.velocityRef.current = 0;
            lineChartForEventsRef.current.scheduleReturnToFollow();
          }
        }
        touchModeRef.current = 'none';
        touchStartRef.current = null;
        pinchStartRef.current = null;
      };

      canvas.addEventListener('wheel', handleWheel, { passive: false });
      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('dblclick', handleDoubleClickFn);

      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('dblclick', handleDoubleClickFn);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [panInertiaRefs]); // 🔥 FIX #10: lineChart убран — используем ref

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          ...style,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'grab',
          touchAction: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

LineChart.displayName = 'LineChart';
