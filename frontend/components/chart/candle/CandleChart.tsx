/**
 * CandleChart - свечной график
 * 
 * FLOW L4: Candle chart component
 * 
 * Содержит всю логику свечного графика
 */

'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useChart } from '../useChart';
import { useCanvasInfrastructure } from '../internal/useCanvasInfrastructure';
import type { CandleMode } from '../internal/candleModes/candleMode.types';
import type { IndicatorConfig } from '../internal/indicators/indicator.types';
import type { OverlayRegistryParams } from '../useChart';

interface CandleChartProps {
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string;
  instrument?: string;
  payoutPercent?: number;
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  overlayRegistry?: OverlayRegistryParams;
  onInstrumentChange?: (instrumentId: string) => void;
  candleMode?: CandleMode;
  onReady?: () => void;
  extraBottomPadding?: number;
  extraTopPadding?: number;
  showMinMaxLabels?: boolean;
  accountCurrency?: string;
}

export interface CandleChartRef {
  setCandleMode: (mode: CandleMode) => void;
  getCandleMode: () => CandleMode;
  setFollowMode: (on: boolean) => void;
  getFollowMode: () => boolean;
  toggleFollowMode: () => void;
  /** FLOW F5/F6: вернуться к актуальным свечам, включить follow */
  followLatest: () => void;
  /** FLOW F8: показывать кнопку «Вернуться к текущим» */
  shouldShowReturnToLatest: () => boolean;
  resetYScale: () => void;
  /** FLOW O6: удалить drawing по id (панель оверлеев) */
  removeDrawing: (id: string) => void;
  /** Получить все drawings */
  getDrawings: () => import('../internal/drawings/drawing.types').Drawing[];
  /** Добавить drawing (для восстановления из layout) */
  addDrawing: (drawing: import('../internal/drawings/drawing.types').Drawing) => void;
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
  setHoverAction: (action: 'CALL' | 'PUT' | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const CandleChart = forwardRef<CandleChartRef, CandleChartProps>(
  ({ className, style, timeframe = '5s', instrument, payoutPercent = 75, digits, activeInstrumentRef, indicatorConfigs = [], drawingMode = null, overlayRegistry, onInstrumentChange, candleMode = 'classic', onReady, extraBottomPadding = 0, extraTopPadding = 0, showMinMaxLabels = true, accountCurrency }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartApi = useChart({ canvasRef, timeframe, instrument, payoutPercent, digits, activeInstrumentRef, indicatorConfigs, drawingMode, overlayRegistry, onInstrumentChange, candleMode, onReady, extraBottomPadding, extraTopPadding, showMinMaxLabels, accountCurrency });

    // Canvas infrastructure
    useCanvasInfrastructure({ canvasRef });

    // Экспортируем API через ref
    useImperativeHandle(ref, () => ({
      setCandleMode: chartApi.setCandleMode,
      getCandleMode: chartApi.getCandleMode,
      setFollowMode: chartApi.setFollowMode,
      getFollowMode: chartApi.getFollowMode,
      toggleFollowMode: chartApi.toggleFollowMode,
      followLatest: chartApi.followLatest,
      shouldShowReturnToLatest: chartApi.shouldShowReturnToLatest,
      resetYScale: chartApi.resetYScale,
      removeDrawing: chartApi.removeDrawing,
      getDrawings: chartApi.getDrawings,
      addDrawing: chartApi.addDrawing,
      clearDrawings: chartApi.clearDrawings,
      setExpirationSeconds: chartApi.setExpirationSeconds,
      addTradeOverlayFromDTO: chartApi.addTradeOverlayFromDTO,
      removeTrade: chartApi.removeTrade,
      setHoverAction: chartApi.setHoverAction,
      zoomIn: chartApi.zoomIn,
      zoomOut: chartApi.zoomOut,
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ ...style, touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

CandleChart.displayName = 'CandleChart';
