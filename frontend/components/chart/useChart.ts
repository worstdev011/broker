/**
 * useChart - entry-point графика (оркестратор)
 * 
 * Роль: координация всех подсистем графика
 * 
 * FLOW G1: инфраструктура canvas
 * FLOW G2: слой данных
 * FLOW G3: viewport & auto-fit
 */

'use client';

import { RefObject, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { useCanvasInfrastructure } from './internal/useCanvasInfrastructure';
import { useChartData } from './internal/useChartData';
import { useViewport } from './internal/useViewport';
import { useRenderLoop } from './internal/useRenderLoop';
import type { ChartCanvasCopy } from './internal/chartCanvasCopy.types';
import { useChartInteractions } from './internal/interactions/useChartInteractions';
import { useHistoryLoader } from './internal/history/useHistoryLoader';
import { useCrosshair } from './internal/crosshair/useCrosshair';
import { useOhlcHover } from './internal/ohlc/useOhlcHover';
import { useCandleCountdown } from './internal/countdown/useCandleCountdown';
import { useCandleMode } from './internal/candleModes/useCandleMode';
import { useIndicators } from './internal/indicators/useIndicators';
import { useDrawings } from './internal/drawings/useDrawings';
import { useDrawingInteractions } from './internal/drawings/useDrawingInteractions';
import { useDrawingEdit } from './internal/drawings/useDrawingEdit';
import { useCandleAnimator } from './internal/useCandleAnimator';
import { useWebSocket, type TradeClosePayload } from '@/lib/hooks/useWebSocket';
import { netPnlFromTradeClose } from '@/lib/tradeClosePnl';
import { DEFAULT_INSTRUMENT_ID } from '@/lib/instruments';
import { dismissToastByKey, showTradeOpenToast, showTradeCloseToast, toast } from '@/stores/toast.store';
import { parseTimeframeToMs } from './internal/utils/timeframe';
import { zoomViewportTime } from './internal/interactions/math';
import { getMinVisibleCandlesForZoom } from './internal/interactions/zoomBreakpoints';
import { formatServerTime } from './internal/utils/formatServerTime';
import type { PriceAlert } from './internal/alerts/priceAlerts.types';
import type { InteractionZone } from './internal/interactions/interaction.types';
import type { ChartSnapshot } from '@/types/terminal';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { Viewport } from './internal/viewport.types';

/** FLOW O: Overlay Registry - canvas читает visibility, UI пишет в registry */
export interface OverlayRegistryParams {
  getVisibleOverlayIds?: () => Set<string> | undefined;
  onDrawingAdded?: (overlay: import('./internal/overlay/overlay.types').DrawingOverlay) => void;
  onTradeAdded?: (overlay: import('./internal/overlay/overlay.types').TradeOverlay) => void;
  onDrawingEdited?: () => void;
}

interface UseChartParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  timeframe?: string;
  instrument?: string;
  payoutPercent?: number;
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  overlayRegistry?: OverlayRegistryParams;
  onInstrumentChange?: (instrumentId: string) => void;
  candleMode?: 'classic' | 'heikin_ashi' | 'bars';
  onReady?: () => void;
  extraBottomPadding?: number;
  extraTopPadding?: number;
  showMinMaxLabels?: boolean;
}

export type HoverAction = 'CALL' | 'PUT' | null;

/** Snap a timestamp to the visual center of the candle that contains it. */
function snapToCandleCenter(
  time: number,
  candles: Array<{ startTime: number; endTime: number }>,
  liveCandle: { startTime: number; endTime: number } | null,
  timeframeMs: number,
): number {
  if (liveCandle && time >= liveCandle.startTime) {
    return liveCandle.startTime + timeframeMs / 2;
  }
  for (let i = candles.length - 1; i >= 0; i--) {
    const c = candles[i];
    if (time >= c.startTime && time < c.endTime) {
      return c.startTime + timeframeMs / 2;
    }
  }
  // Fallback: align to the nearest timeframe slot center
  const slot = Math.floor(time / timeframeMs) * timeframeMs;
  return slot + timeframeMs / 2;
}

interface UseChartReturn {
  setCandleMode: (mode: 'classic' | 'heikin_ashi' | 'bars') => void;
  getCandleMode: () => 'classic' | 'heikin_ashi' | 'bars';
  setFollowMode: (on: boolean) => void;
  getFollowMode: () => boolean;
  toggleFollowMode: () => void;
  /** FLOW F5/F6: вернуться к актуальным свечам, включить follow */
  followLatest: () => void;
  /** FLOW F8: показывать кнопку «Вернуться к текущим» */
  shouldShowReturnToLatest: () => boolean;
  resetYScale: () => void;
  /** FLOW O6: удаление drawing по id (панель вызывает при ❌) */
  removeDrawing: (id: string) => void;
  /** Получить все drawings */
  getDrawings: () => import('./internal/drawings/drawing.types').Drawing[];
  /** Добавить drawing (для восстановления из layout) */
  addDrawing: (drawing: import('./internal/drawings/drawing.types').Drawing) => void;
  /** Очистить все drawings */
  clearDrawings: () => void;
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
  /** FLOW BO-HOVER: установить hover action (CALL/PUT/null) */
  setHoverAction: (action: HoverAction) => void;
  /** FLOW BO-HOVER: получить текущий hover action */
  getHoverAction: () => HoverAction;
  /** FLOW C-MARKET-ALTERNATIVES: обработка клика по альтернативной паре */
  handleAlternativeClick: (instrumentId: string) => void;
  /** FLOW C-MARKET-ALTERNATIVES: обработка hover по альтернативной паре */
  handleAlternativeHover: (mouseX: number, mouseY: number) => number | null;
  zoomIn: () => void;
  zoomOut: () => void;
}

const DRAWING_OVERLAY_LABEL_KEYS: Record<
  import('./internal/drawings/drawing.types').Drawing['type'],
  string
> = {
  horizontal: 'draw_horizontal',
  vertical: 'draw_vertical',
  trend: 'draw_trend',
  rectangle: 'draw_rectangle',
  fibonacci: 'draw_fibonacci',
  'parallel-channel': 'draw_parallel',
  ray: 'draw_ray',
  arrow: 'draw_arrow',
};

export function useChart({ canvasRef, timeframe = '5s', instrument, payoutPercent = 75, digits, activeInstrumentRef, indicatorConfigs = [], drawingMode = null, overlayRegistry, onInstrumentChange, candleMode: initialCandleMode = 'classic', onReady, extraBottomPadding = 0, extraTopPadding = 0, showMinMaxLabels = true }: UseChartParams): UseChartReturn {
  const t = useTranslations('terminal');

  const tradeToastRef = useRef<{ openMsg: string; formatTie: (amt: string) => string }>({
    openMsg: '',
    formatTie: () => '',
  });
  tradeToastRef.current = {
    openMsg: t('toast_trade_opened'),
    formatTie: (amt: string) => t('toast_trade_tie', { amount: amt }),
  };

  const chartCanvasCopy: ChartCanvasCopy = useMemo(
    () => ({
      ohlcOpen: t('ohlc_open'),
      ohlcHigh: t('ohlc_high'),
      ohlcLow: t('ohlc_low'),
      ohlcClose: t('ohlc_close'),
      marketClosedTitle: t('market_closed_title'),
      marketResumeIn: t('market_resume_in'),
      marketWeekendIdle: t('market_weekend_idle'),
      marketHolidayIdle: t('market_holiday_idle'),
      marketMaintenanceIdle: t('market_maintenance_idle'),
      formatCountdownDHM: (days, hours, minutes) =>
        t('market_countdown_dhm', { days, hours, minutes }),
      formatCountdownHMS: (hours, minutes, seconds) =>
        t('market_countdown_hms', { hours, minutes, seconds }),
      alternativesHeader: t('market_alternatives_header'),
    }),
    [t],
  );

  // FLOW G1: инициализация инфраструктуры canvas
  useCanvasInfrastructure({ canvasRef });

  // Вычисляем timeframeMs
  const timeframeMs = parseTimeframeToMs(timeframe);

  // 🔥 FLOW WS-TF: Ref для передачи текущего таймфрейма в useWebSocket
  const activeTimeframeRef = useRef<string>(timeframe);
  activeTimeframeRef.current = timeframe; // Синхронизируем при каждом рендере

  // 🔥 FLOW C-CHART-TYPE-RESET: Reset при монтировании компонента
  // При смене chartType компонент полностью пересоздается через ChartContainer (key),
  // поэтому reset при монтировании гарантирует чистое состояние
  const isInitialMountRef = useRef<boolean>(true);

  // Always-current ref for instrument — avoids stale closure in initializeChart useCallback
  const instrumentRef = useRef(instrument);
  instrumentRef.current = instrument;

  // При price:update - только Y (auto-fit), без движения по X. Сдвиг по X только при candle:close и по кнопке «Вернуться».
  const viewportRecalculateYOnlyRef = useRef<() => void>(() => {});

  // FLOW G2: инициализация слоя данных
  const chartData = useChartData({
    onDataChange: () => {
      viewportRecalculateYOnlyRef.current?.();
    },
    timeframeMs,
  });

  // 🔥 FLOW C-INERTIA: Создаем refs для pan инерции (используются в useChartInteractions и useViewport)
  const panVelocityPxPerMsRef = useRef<number>(0);
  const panInertiaActiveRef = useRef<boolean>(false);
  const panInertiaRefs = {
    velocityRef: panVelocityPxPerMsRef,
    activeRef: panInertiaActiveRef,
  };

  // 🔥 FLOW C-INERTIA: Создаем ref для onViewportChange callback (обновляется после создания historyLoader)
  const onViewportChangeRef = useRef<((viewport: Viewport) => void) | null>(null);

  // FLOW CONTINUOUS-FOLLOW: ref для getServerTimeMs (определяется позже, ref позволяет избежать TDZ)
  const getServerTimeMsRef = useRef<(() => number) | null>(null);

  // FLOW G3: инициализация viewport
  const viewport = useViewport({
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    timeframeMs,
    canvasRef, // 🔥 FLOW: Передаем canvasRef для вычисления visibleCandles
    panInertiaRefs,
    onViewportChangeRef, // 🔥 FLOW C-INERTIA: Передаем ref для callback
    getMarketStatus: chartData.getMarketStatus, // FLOW C-MARKET-CLOSED: останавливать инерцию когда рынок закрыт
    getServerTimeMs: () => getServerTimeMsRef.current?.() ?? Date.now(),
    extraBottomPx: extraBottomPadding,
  });

  viewportRecalculateYOnlyRef.current = viewport.recalculateYOnly;

  // FLOW G7: crosshair (снэп к центру свечи по timeframeMs)
  const crosshair = useCrosshair({
    canvasRef,
    getViewport: viewport.getViewport,
    getTimeframeMs: () => timeframeMs,
  });

  // FLOW G8: OHLC hover panel
  const ohlcHover = useOhlcHover({
    getCrosshair: crosshair.getCrosshair,
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    timeframeMs,
  });

  // FLOW G11: Candle animator (анимация live-свечи)
  const candleAnimator = useCandleAnimator({
    getLiveCandle: chartData.getLiveCandle,
  });

  // FLOW G10: Candle modes
  const candleMode = useCandleMode({
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    initialMode: initialCandleMode,
  });

  // FLOW G12: Indicators
  const indicators = useIndicators({
    getCandles: chartData.getCandles, // Используем source candles (classic)
    indicatorConfigs,
  });

  // FLOW A1: Price Alerts model (ref storage, не влияет на рендер)
  const priceAlertsRef = useRef<PriceAlert[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // FLOW T-OVERLAY: Trades storage (ref-based, не влияет на рендер)
  const tradesRef = useRef<Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    amount?: number;
    snappedEntryTime?: number;
  }>>([]);

  const lastTradeCleanupRef = useRef(0);

  // Кратковременные метки результата сделки (после закрытия, ~5 секунд)
  const RECENT_TRADE_DISPLAY_MS = 5000;
  const recentClosedTradesRef = useRef<Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    snappedEntryTime?: number;
    amount?: number;
    result: 'WIN' | 'LOSS' | 'TIE';
    pnl: number;
    showUntil: number;
  }>>([]);

  const getTrades = (): typeof tradesRef.current => {
    const now = Date.now();
    if (now - lastTradeCleanupRef.current > 5000 && tradesRef.current.length > 0) {
      lastTradeCleanupRef.current = now;
      tradesRef.current = tradesRef.current.filter((t) => t.expiresAt > now);
    }
    return tradesRef.current;
  };

  const removeTrade = (id: string): void => {
    tradesRef.current = tradesRef.current.filter((t) => t.id !== id);
  };

  const getRecentClosedTrades = (): typeof recentClosedTradesRef.current => {
    const now = Date.now();
    if (recentClosedTradesRef.current.length > 0) {
      recentClosedTradesRef.current = recentClosedTradesRef.current.filter(
        (t) => t.showUntil > now,
      );
    }
    return recentClosedTradesRef.current;
  };

  const addPriceAlert = (price: number): void => {
    if (!Number.isFinite(price)) return;
    priceAlertsRef.current = [
      ...priceAlertsRef.current,
      {
        id: crypto.randomUUID(),
        price,
        triggered: false,
      },
    ];
  };

  const getPriceAlerts = (): PriceAlert[] => {
    return priceAlertsRef.current;
  };

  // FLOW A2: Interaction zones (hit‑зоны для кликов по canvas)
  const interactionZonesRef = useRef<InteractionZone[]>([]);

  const registerInteractionZone = (zone: InteractionZone): void => {
    interactionZonesRef.current.push(zone);
  };

  const clearInteractionZones = (): void => {
    interactionZonesRef.current = [];
  };

  const getInteractionZones = (): InteractionZone[] => {
    return interactionZonesRef.current;
  };

  // FLOW G14: Drawings
  const drawings = useDrawings();

  // FLOW O7: при создании drawing - добавляем в Overlay Registry (если передан onDrawingAdded)
  const onDrawingAddedRef = useRef(overlayRegistry?.onDrawingAdded);
  onDrawingAddedRef.current = overlayRegistry?.onDrawingAdded;
  const addDrawingWithOverlay = useCallback(
    (d: import('./internal/drawings/drawing.types').Drawing) => {
      drawings.addDrawing(d);
      const cb = onDrawingAddedRef.current;
      if (cb) {
        const labelKey = DRAWING_OVERLAY_LABEL_KEYS[d.type] ?? 'draw_ray';
        const name = t(labelKey);
        const points: { time: number; price: number }[] =
          d.type === 'trend' || d.type === 'rectangle' || d.type === 'fibonacci' || d.type === 'parallel-channel' || d.type === 'ray' || d.type === 'arrow'
            ? [d.start, d.end]
            : d.type === 'horizontal'
              ? [{ time: 0, price: d.price }]
              : [{ time: d.time, price: 0 }];

        const drawingType: import('./internal/overlay/overlay.types').DrawingOverlay['drawingType'] = d.type;

        cb({
          id: d.id,
          type: 'drawing',
          name,
          visible: true,
          drawingType,
          points,
        });
      }
    },
    [drawings, t]
  );

  // FLOW G14: Drawing interactions (создание)
  useDrawingInteractions({
    canvasRef,
    getViewport: viewport.getViewport,
    getCrosshair: crosshair.getCrosshair,
    mode: drawingMode || null,
    addDrawing: addDrawingWithOverlay,
  });

  // onReady callback ref (stable across renders)
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // FLOW T1/T4: Server time - refs, без state/setInterval. Drift compensation через performance.now()
  const serverTimeRef = useRef<{ timestamp: number; utcOffsetMinutes: number } | null>(null);
  const lastSyncTimeRef = useRef(0);

  // FLOW E1: Expiration seconds - хранится в ref, меняется только UI терминала
  const expirationSecondsRef = useRef<number>(60);

  // Deferred work timeout IDs (cleanup on unmount)
  const deferredTimersRef = useRef<NodeJS.Timeout[]>([]);

  // FLOW BO-HOVER: Hover action state (ref-based, не триггерит render)
  const hoverActionRef = useRef<HoverAction>(null);

  // FLOW BO-HOVER-ARROWS: Предзагрузка изображений стрелок
  const arrowUpImgRef = useRef<HTMLImageElement | null>(null);
  const arrowDownImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Загружаем изображения один раз при монтировании
    const up = new Image();
    up.src = '/images/arrowup.png';
    arrowUpImgRef.current = up;

    const down = new Image();
    down.src = '/images/arrowdown.png';
    arrowDownImgRef.current = down;
  }, []);

  // FLOW BO-HOVER: методы для управления hover action
  const setHoverAction = useCallback((action: HoverAction) => {
    hoverActionRef.current = action;
  }, []);

  const getHoverAction = useCallback((): HoverAction => {
    return hoverActionRef.current;
  }, []);

  // FLOW C-MARKET-ALTERNATIVES: Hitboxes для альтернативных пар
  const marketAlternativesHitboxesRef = useRef<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    instrumentId: string;
  }>>([]);

  // FLOW C-MARKET-ALTERNATIVES: Hovered index для альтернативных пар
  const marketAlternativesHoveredIndexRef = useRef<number | null>(null);

  // FLOW C-MARKET-ALTERNATIVES: Обработка клика по альтернативной паре
  const handleAlternativeClick = useCallback((instrumentId: string) => {
    if (onInstrumentChange) {
      onInstrumentChange(instrumentId);
    }
  }, [onInstrumentChange]);

  // FLOW C-MARKET-ALTERNATIVES: Обработка hover по альтернативной паре
  const handleAlternativeHover = useCallback((mouseX: number, mouseY: number): number | null => {
    const hitboxes = marketAlternativesHitboxesRef.current;
    for (let i = 0; i < hitboxes.length; i++) {
      const box = hitboxes[i];
      if (
        mouseX >= box.x &&
        mouseX <= box.x + box.width &&
        mouseY >= box.y &&
        mouseY <= box.y + box.height
      ) {
        marketAlternativesHoveredIndexRef.current = i;
        return i;
      }
    }
    marketAlternativesHoveredIndexRef.current = null;
    return null;
  }, []);

  // FLOW G16: Drawing edit (hover, select, drag, resize)
  const hoveredDrawingIdRef = useRef<string | null>(null);
  const hoveredDrawingModeRef = useRef<string | null>(null);
  const selectedDrawingIdRef = useRef<string | null>(null);
  const editStateRef = useRef<{ drawingId: string; mode: string } | null>(null);
  const isEditingDrawingRef = useRef<boolean>(false);
  const hitTestDrawingRef = useRef<(x: number, y: number) => boolean>(() => false);

  useDrawingEdit({
    canvasRef,
    getViewport: viewport.getViewport,
    getDrawings: drawings.getDrawings,
    updateDrawing: drawings.updateDrawing,
    onHoverChange: (drawingId, mode) => {
      hoveredDrawingIdRef.current = drawingId;
      hoveredDrawingModeRef.current = mode;
    },
    onEditStateChange: (editState) => {
      const wasEditing = isEditingDrawingRef.current;
      selectedDrawingIdRef.current = editState?.drawingId ?? null;
      editStateRef.current = editState ?? null;
      isEditingDrawingRef.current = editState !== null;
      if (wasEditing && editState === null) {
        overlayRegistry?.onDrawingEdited?.();
      }
    },
    getIsEditing: () => isEditingDrawingRef.current,
    onRegisterHitTest: (fn) => { hitTestDrawingRef.current = fn; },
  });

  // FLOW G4: запуск render loop
  // Вычисляем timeframeMs для render loop
  const timeframeMsRef = useRef<number>(timeframeMs);

  useEffect(() => {
    timeframeMsRef.current = timeframeMs;
  }, [timeframeMs]);

  // FLOW T4/T5: отображаемое время = serverTime + drift от последнего WS-апдейта
  const getServerTimeText = useCallback((): string => {
    const s = serverTimeRef.current;
    if (!s) return '';
    const now = s.timestamp + (performance.now() - lastSyncTimeRef.current);
    return formatServerTime(now, s.utcOffsetMinutes);
  }, []);

  // FLOW C-TIMER: получение серверного времени в миллисекундах
  const getServerTimeMs = useCallback((): number => {
    const s = serverTimeRef.current;
    if (!s) return Date.now(); // Fallback на локальное время
    return s.timestamp + (performance.now() - lastSyncTimeRef.current);
  }, []);
  getServerTimeMsRef.current = getServerTimeMs;

  // FLOW E3: единственный источник truth по времени экспирации (в мс)
  // Anchored to the right edge of the live candle so the line never
  // overlaps the candle body on large timeframes.
  const getExpirationTime = useCallback((): number | null => {
    const s = serverTimeRef.current;
    if (!s) return null;
    const now = s.timestamp + (performance.now() - lastSyncTimeRef.current);
    const liveCandle = chartData.getLiveCandle();
    const anchor = liveCandle ? Math.max(now, liveCandle.startTime + timeframeMs) : now;
    return anchor + expirationSecondsRef.current * 1000;
  }, [chartData, timeframeMs]);

  // Получение секунд экспирации для отображения метки
  const getExpirationSeconds = useCallback((): number => {
    return expirationSecondsRef.current;
  }, []);

  // FLOW C1-C3: Таймер обратного отсчета до закрытия свечи
  // FLOW FIX-COUNTDOWN: Не используем getLiveCandle - считаем от квантов времени
  // Должен быть объявлен ДО useRenderLoop, так как используется в нем
  const candleCountdown = useCandleCountdown({
    timeframeMs,
    getServerTimeMs,
  });

  // API для UI терминала: менять только ref, без state/props
  const setExpirationSeconds = (seconds: number): void => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    expirationSecondsRef.current = seconds;
  };

  useRenderLoop({
    canvasRef,
    getViewport: viewport.getViewport,
    getRenderCandles: candleMode.getRenderCandles,
    getRenderLiveCandle: candleMode.getRenderLiveCandle,
    getAnimatedCandle: candleAnimator.getAnimatedCandle,
    getLiveCandleForRender: candleMode.getLiveCandleForRender,
    updateAnimator: candleAnimator.update,
    getFollowMode: viewport.getFollowMode,
    advanceFollowAnimation: viewport.advanceFollowAnimation,
    advanceYAnimation: viewport.advanceYAnimation,
    getPriceAlerts,
    registerInteractionZone,
    clearInteractionZones,
    getTimeframeMs: () => timeframeMsRef.current,
    getCrosshair: crosshair.getCrosshair,
    getOhlc: ohlcHover.getOhlc,
    updateOhlc: ohlcHover.updateOhlc,
    getMode: candleMode.getMode,
    getIndicatorSeries: indicators.getIndicatorSeries,
    indicatorConfigs,
    getDrawings: drawings.getDrawings,
    getHoveredDrawingId: () => hoveredDrawingIdRef.current,
    getSelectedDrawingId: () => selectedDrawingIdRef.current,
    getVisibleOverlayIds: overlayRegistry?.getVisibleOverlayIds,
    getServerTimeText,
    getServerTimeMs,
    getDigits: () => digits,
    getExpirationTime,
    getExpirationSeconds,
    getTrades,
    getRecentClosedTrades,
    getPayoutPercent: () => payoutPercent,
    getTimeframeLabel: candleCountdown.getTimeframeLabel,
    getFormattedCountdown: candleCountdown.getFormattedTime,
    getHoverAction,
    getArrowUpImg: () => arrowUpImgRef.current,
    getArrowDownImg: () => arrowDownImgRef.current,
    advancePanInertia: viewport.advancePanInertia, // 🔥 FLOW C-INERTIA: Pan inertia animation
    advanceLiveCandle: chartData.advanceLiveCandle, // FLOW CONTINUOUS-FOLLOW: авто-создание flat свечей
    advanceContinuousFollow: viewport.advanceContinuousFollow, // FLOW CONTINUOUS-FOLLOW: непрерывное движение viewport
    getMarketStatus: chartData.getMarketStatus, // FLOW C-MARKET-CLOSED: статус рынка
    getNextMarketOpenAt: chartData.getNextMarketOpenAt, // FLOW C-MARKET-COUNTDOWN: время следующего открытия
    getTopAlternatives: chartData.getTopAlternatives, // FLOW C-MARKET-ALTERNATIVES: альтернативные пары
    marketAlternativesHitboxesRef, // FLOW C-MARKET-ALTERNATIVES: ref для hitboxes
    getMarketAlternativesHoveredIndex: () => marketAlternativesHoveredIndexRef.current, // FLOW C-MARKET-ALTERNATIVES: hovered index
    instrument, // Watermark: полупрозрачное название инструмента
    timeframe,  // Watermark: таймфрейм под названием
    extraBottomPadding,
    extraTopPadding,
    showMinMaxLabels,
    getChartCanvasCopy: () => chartCanvasCopy,
  });

  // FLOW G6/P9: history loading по instrument (id для API ?instrument=)
  // FLOW R-FIX: Используем ТОЛЬКО переданный instrument, без fallback на snapshot
  // чтобы избежать смешивания OTC и REAL инструментов
  const asset = instrument || DEFAULT_INSTRUMENT_ID;

  const historyLoader = useHistoryLoader({
    getCandles: chartData.getCandles,
    getEarliestRealTime: chartData.getEarliestRealTime,
    prependCandles: chartData.prependCandles,
    timeframe,
    timeframeMs,
    asset,
  });

  // 🔥 FLOW C-INERTIA: Обновляем callback для onViewportChange после создания historyLoader
  useEffect(() => {
    onViewportChangeRef.current = (newViewport: Viewport) => {
      historyLoader.maybeLoadMore(newViewport);
    };
  }, [historyLoader]);

  // FLOW G5: interactions (pan / zoom)
  const chartInteractions = useChartInteractions({
    canvasRef,
    viewportRef: viewport.viewportRef,
    updateViewport: viewport.updateViewport,
    timeframeMs,
    visibleCandles: viewport.config.visibleCandles,
    onViewportChange: (newViewport) => {
      // После pan/zoom проверяем, нужно ли загрузить историю
      historyLoader.maybeLoadMore(newViewport);
    },
    panInertiaRefs, // 🔥 FLOW C-INERTIA: Передаем refs для инерции
    getIsEditingDrawing: () => isEditingDrawingRef.current, // FLOW G16: Блокируем pan при редактировании
    getIsPointOnDrawing: (x, y) => hitTestDrawingRef.current(x, y), // FLOW G16-TOUCH: пропуск pan при touch на drawing
    getMarketStatus: chartData.getMarketStatus, // FLOW C-MARKET-CLOSED: блокируем pan/zoom когда рынок закрыт
    marketAlternativesHitboxesRef, // FLOW C-MARKET-ALTERNATIVES: Hitboxes для альтернативных пар
    onAlternativeClick: handleAlternativeClick, // FLOW C-MARKET-ALTERNATIVES: Обработка клика
    onAlternativeHover: handleAlternativeHover, // FLOW C-MARKET-ALTERNATIVES: Обработка hover
    getDrawingEditState: () => editStateRef.current,
    getHoveredDrawingMode: () => hoveredDrawingModeRef.current,
    setFollowMode: viewport.setFollowMode, // 🔥 FLOW F1: Выключение follow при взаимодействии
    // 🔥 FLOW Y1: Y-scale drag API
    beginYScaleDrag: viewport.beginYScaleDrag,
    updateYScaleDrag: viewport.updateYScaleDrag,
    endYScaleDrag: viewport.endYScaleDrag,
    // FLOW A: Price Alerts
    getInteractionZones,
    addPriceAlert,
    // 🔥 FLOW Y1: Reset Y-Scale при двойном клике на метки цены
    resetYScale: viewport.resetYScale,
    // 🔥 FLOW RETURN-TO-FOLLOW: Планирование возврата после pan/zoom
    scheduleReturnToFollow: viewport.scheduleReturnToFollow,
  });

  // 🔥 FLOW C-CHART-TYPE-RESET: Reset при монтировании компонента
  // При смене chartType компонент полностью пересоздается через ChartContainer (key),
  // поэтому reset при монтировании гарантирует чистое состояние
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      
      // Полный reset при первом монтировании (или при пересоздании из-за смены chartType)
      // Шаг 1: Reset viewport (сброс zoom/pan, follow mode = true)
      viewport.reset();
      
      // Шаг 2: Reset interactions (сброс pan/zoom состояния, инерции)
      chartInteractions.reset();
      
      // Шаг 3: Reset данных свечей
      chartData.reset();
      
      // Шаг 4: Reset анимации
      candleAnimator.reset();
      
      // Шаг 5: Reset history loader
      historyLoader.reset();
      
      // Шаг 6: Reset countdown timer
      candleCountdown.reset();
      
      // Шаг 7: Гарантируем follow mode и остановку инерции
      viewport.setFollowMode(true);
      chartInteractions.stopInertia?.();
    }
  }, []); // Пустой массив зависимостей - только при монтировании

  // Chart initialization from WS chart:init (single source of truth for chart data)
  const initializeChart = useCallback((chartSnapshot: ChartSnapshot) => {
    if (instrumentRef.current && chartSnapshot.instrument !== instrumentRef.current) return;

    chartData.reset();
    candleAnimator.reset();
    historyLoader.reset();
    candleCountdown.reset();

    const candles = chartSnapshot.candles;
    const currentPrice = chartSnapshot.price?.value ?? null;
    const currentTime = chartSnapshot.price?.timestamp ?? chartSnapshot.serverTime;
    const tfMs = parseTimeframeToMs(chartSnapshot.timeframe);

    chartData.initializeFromSnapshot(
      candles,
      currentPrice,
      currentTime,
      tfMs,
      chartSnapshot.marketStatus,
      chartSnapshot.nextMarketOpenAt,
      chartSnapshot.topAlternatives ?? [],
      chartSnapshot.activeCandle ?? null,
    );

    serverTimeRef.current = {
      timestamp: chartSnapshot.serverTime,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    };
    lastSyncTimeRef.current = performance.now();

    viewport.skipNextFollowAnimation();
    viewport.recalculateViewport();
    viewport.setLatestCandleTime(chartData.getLiveCandle()?.endTime ?? currentTime);

    requestAnimationFrame(() => {
      onReadyRef.current?.();
      const currentViewport = viewport.getViewport();
      if (currentViewport && chartData.getCandles().length > 0) {
        historyLoader.maybeLoadMore(currentViewport);
      }
    });
  }, []); // instrumentRef.current always reflects latest value — no stale closure

  // WebSocket - single source of truth for chart data + real-time updates
  useWebSocket({
    activeInstrumentRef,
    activeTimeframeRef,
    onTradeOpen: (data) => showTradeOpenToast(data, tradeToastRef.current.openMsg),
    onTradeClose: (data: TradeClosePayload) => {
      // Удаляем активный оверлей сделки и добавляем краткосрочную метку результата
      removeTrade(data.id);

      const entryPrice = parseFloat(data.entryPrice);
      const amount = parseFloat(data.amount);
      const openedAt = new Date(data.openedAt).getTime();
      const expiresAt = new Date(data.expiresAt).getTime();

      if (
        Number.isFinite(entryPrice) &&
        Number.isFinite(amount) &&
        Number.isFinite(openedAt) &&
        Number.isFinite(expiresAt)
      ) {
        const candles = chartData.getCandles();
        const liveCandle = chartData.getLiveCandle();
        const snappedEntryTime = snapToCandleCenter(
          openedAt,
          candles,
          liveCandle,
          timeframeMs,
        );
        const pnl = netPnlFromTradeClose(data);
        const now = Date.now();

        recentClosedTradesRef.current = [
          ...recentClosedTradesRef.current.filter((t) => t.id !== data.id),
          {
            id: data.id,
            direction: data.direction,
            entryPrice,
            openedAt,
            expiresAt,
            snappedEntryTime,
            amount,
            result: data.result,
            pnl,
            showUntil: now + RECENT_TRADE_DISPLAY_MS,
          },
        ];
      }

      dismissToastByKey(data.id);
      showTradeCloseToast(data, tradeToastRef.current.formatTie);
    },
    onServerTime: (timestamp) => {
      if (serverTimeRef.current) serverTimeRef.current.timestamp = timestamp;
      lastSyncTimeRef.current = performance.now();
    },
    onChartInit: initializeChart,
    onPriceUpdate: (price, timestamp) => {
      chartData.handlePriceUpdate(price, timestamp);
      viewport.setLatestCandleTime(chartData.getLiveCandle()?.endTime ?? timestamp);
      candleAnimator.onPriceUpdate(price);

      const prev = lastPriceRef.current;
      lastPriceRef.current = price;
      if (prev === null || !Number.isFinite(prev) || !Number.isFinite(price)) {
        prevPriceRef.current = lastPriceRef.current;
        return;
      }

      prevPriceRef.current = prev;

      const last = lastPriceRef.current!;
      for (const priceAlert of priceAlertsRef.current) {
        if (priceAlert.triggered) continue;

        const crossed =
          (prev < priceAlert.price && last >= priceAlert.price) ||
          (prev > priceAlert.price && last <= priceAlert.price);

        if (crossed) {
          priceAlert.triggered = true;
          toast(t('price_alert_crossed', { price: priceAlert.price.toFixed(2) }), 'info');
        }
      }
    },
    onCandleSnapshot: (candles) => {
      const match = candles.find((c: { timeframe: string; candle: any }) => c.timeframe === timeframe);
      if (!match) return;

      const liveCandle = chartData.getLiveCandle();
      const tfMs = parseTimeframeToMs(timeframe);

      if (liveCandle && match.candle.timestamp > liveCandle.startTime + tfMs * 1.5) {
        // Gap detected - WS will send a fresh chart:init on next subscribe cycle
        chartData.applyActiveCandleSnapshot(match.candle);
        viewport.recalculateYOnly();
      } else {
        chartData.applyActiveCandleSnapshot(match.candle);
        viewport.recalculateYOnly();
      }
    },
    onCandleClose: (wsCandle, timeframeStr) => {
      if (timeframeStr !== timeframe) {
        return;
      }

      const timeframeMs = parseTimeframeToMs(timeframeStr);

      const snapshotCandle = {
        open: wsCandle.open,
        high: wsCandle.high,
        low: wsCandle.low,
        close: wsCandle.close,
        startTime: wsCandle.timestamp,
        endTime: wsCandle.timestamp + timeframeMs,
      };

      chartData.handleCandleClose(snapshotCandle, snapshotCandle.endTime, timeframeMs);
      viewport.setLatestCandleTime(snapshotCandle.endTime);
      candleAnimator.onCandleClose();

      if (viewport.getFollowMode()) {
        viewport.recalculateViewport();
      } else {
        viewport.recalculateYOnly();
      }
    },
    enabled: !!instrument,
  });

  useEffect(() => {
    return () => {
      deferredTimersRef.current.forEach(clearTimeout);
      deferredTimersRef.current = [];
    };
  }, []);

  /** FLOW F5/F6: вернуться к актуальным свечам, включить follow */
  const followLatest = (): void => {
    viewport.setFollowMode(true);
    viewport.followLatest();
  };

  /** FLOW T-OVERLAY: добавить overlay по Trade DTO (HTTP) */
  const addTradeOverlayFromDTO = (trade: {
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
    amount?: string; // Сумма сделки
  }): void => {
    const entryPrice = parseFloat(trade.entryPrice);
    const openedAt = new Date(trade.openedAt).getTime();
    const expiresAt = new Date(trade.expiresAt).getTime();
    const amount = trade.amount ? parseFloat(trade.amount) : undefined;

    if (!Number.isFinite(entryPrice) || !Number.isFinite(openedAt) || !Number.isFinite(expiresAt)) {
      logger.error('[useChart] Invalid trade data', trade, {
        entryPrice,
        openedAt,
        expiresAt,
        amount,
      });
      return;
    }
    

    // Snap entry to the center of the candle where the trade was opened
    const candles = chartData.getCandles();
    const liveCandle = chartData.getLiveCandle();
    const snappedEntryTime = snapToCandleCenter(openedAt, candles, liveCandle, timeframeMs);

    const tradeData = {
      id: trade.id,
      direction: trade.direction,
      entryPrice,
      openedAt,
      expiresAt,
      amount,
      snappedEntryTime,
    };

    tradesRef.current = [
      ...tradesRef.current.filter(t => t.id !== trade.id),
      tradeData,
    ];


    // Добавляем в overlay registry для отображения в панели
    const onTradeAdded = overlayRegistry?.onTradeAdded;
    if (onTradeAdded) {
      onTradeAdded({
        id: trade.id,
        type: 'trade',
        name:
          trade.direction === 'CALL'
            ? t('overlay_trade_higher', { price: entryPrice.toFixed(5) })
            : t('overlay_trade_lower', { price: entryPrice.toFixed(5) }),
        visible: true,
        tradeId: trade.id,
        direction: trade.direction,
        entryPrice,
        openedAt,
        expiresAt,
      });
    }
  };

  const BUTTON_ZOOM_STEP = 0.15;
  const ZOOM_ANIM_DURATION = 180;
  const zoomAnimRef = useRef<number | null>(null);

  const animateZoom = useCallback((factor: number) => {
    if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);

    const startVp = viewport.viewportRef.current;
    if (!startVp) return;

    const anchorTime = (startVp.timeStart + startVp.timeEnd) / 2;
    const targetVp = zoomViewportTime({
      viewport: startVp,
      zoomFactor: factor,
      anchorTime,
      minVisibleCandles: getMinVisibleCandlesForZoom(),
      maxVisibleCandles: 300,
      timeframeMs,
    });

    viewport.setFollowMode(false);

    const startTs = startVp.timeStart;
    const startTe = startVp.timeEnd;
    const dTs = targetVp.timeStart - startTs;
    const dTe = targetVp.timeEnd - startTe;
    const t0 = performance.now();

    const step = (now: number) => {
      const elapsed = now - t0;
      const rawP = Math.min(1, elapsed / ZOOM_ANIM_DURATION);
      const p = 1 - Math.pow(1 - rawP, 3);

      const curVp = viewport.viewportRef.current;
      if (!curVp) return;

      viewport.updateViewport({
        timeStart: startTs + dTs * p,
        timeEnd: startTe + dTe * p,
        priceMin: curVp.priceMin,
        priceMax: curVp.priceMax,
        yMode: curVp.yMode,
      });

      if (rawP < 1) {
        zoomAnimRef.current = requestAnimationFrame(step);
      } else {
        zoomAnimRef.current = null;
        viewport.scheduleReturnToFollow();
      }
    };

    zoomAnimRef.current = requestAnimationFrame(step);
  }, [viewport, timeframeMs]);

  const zoomIn = useCallback(() => animateZoom(1 - BUTTON_ZOOM_STEP), [animateZoom]);
  const zoomOut = useCallback(() => animateZoom(1 + BUTTON_ZOOM_STEP), [animateZoom]);

  useEffect(() => {
    return () => {
      if (zoomAnimRef.current) {
        cancelAnimationFrame(zoomAnimRef.current);
        zoomAnimRef.current = null;
      }
    };
  }, []);

  return {
    setCandleMode: candleMode.setMode,
    getCandleMode: candleMode.getMode,
    setFollowMode: viewport.setFollowMode,
    getFollowMode: viewport.getFollowMode,
    toggleFollowMode: viewport.toggleFollowMode,
    followLatest,
    shouldShowReturnToLatest: viewport.shouldShowReturnToLatest,
    resetYScale: viewport.resetYScale,
    removeDrawing: drawings.removeDrawing,
    getDrawings: drawings.getDrawings,
    addDrawing: addDrawingWithOverlay,
    clearDrawings: drawings.clearDrawings,
    setExpirationSeconds,
    addTradeOverlayFromDTO,
    removeTrade,
    setHoverAction,
    getHoverAction,
    handleAlternativeClick,
    handleAlternativeHover,
    zoomIn,
    zoomOut,
  };
}
