'use client';

import { useRef, useEffect } from 'react';
import { CandleChart, type CandleChartRef } from './candle/CandleChart';
import { LineChart, type LineChartRef } from './line/LineChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import type { ChartType } from './chart.types';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { OverlayRegistryParams } from './useChart';
import type { CandleMode } from './internal/candleModes/candleMode.types';
import type { TradeClosePayload } from '@/lib/hooks/useWebSocket';

interface ChartContainerProps {
  type: ChartType;
  candleMode?: CandleMode;
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
  onCandleChartRef?: (ref: CandleChartRef | null) => void;
  onLineChartRef?: (ref: LineChartRef | null) => void;
  onInstrumentChange?: (instrumentId: string) => void;
  extraBottomPadding?: number;
  /** Inset expiration/trade verticals from chart top (mobile toolbar overlay). */
  extraTopPadding?: number;
  showMinMaxLabels?: boolean;
  /** User/account currency for trade overlays and chart toasts */
  accountCurrency?: string;
  /** Callback refs for feeding WS data into LineChart from parent */
  linePriceUpdateRef?: React.MutableRefObject<((price: number, timestamp: number) => void) | null>;
  lineServerTimeRef?: React.MutableRefObject<((timestamp: number) => void) | null>;
  lineTradeCloseRef?: React.MutableRefObject<((data: TradeClosePayload) => void) | null>;
}

export function ChartContainer({
  type,
  candleMode = 'classic',
  className,
  style,
  timeframe,
  instrument,
  payoutPercent = 75,
  digits,
  activeInstrumentRef,
  indicatorConfigs,
  drawingMode,
  overlayRegistry,
  onCandleChartRef,
  onLineChartRef,
  onInstrumentChange,
  extraBottomPadding = 0,
  extraTopPadding = 0,
  showMinMaxLabels = true,
  accountCurrency,
  linePriceUpdateRef,
  lineServerTimeRef,
  lineTradeCloseRef,
}: ChartContainerProps) {
  const candleChartRef = useRef<CandleChartRef>(null);
  const lineChartRef = useRef<LineChartRef>(null);

  useEffect(() => {
    onCandleChartRef?.(candleChartRef.current);
  }, [onCandleChartRef, type]);

  useEffect(() => {
    onLineChartRef?.(lineChartRef.current);
  }, [onLineChartRef, type]);

  const isLine = type === 'line';

  return (
    <div className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      <ChartErrorBoundary>
        <div style={{ width: '100%', height: '100%' }}>
          {isLine ? (
            <LineChart
              ref={lineChartRef}
              className="w-full h-full"
              style={{ display: 'block' }}
              instrument={instrument}
              payoutPercent={payoutPercent}
              activeInstrumentRef={activeInstrumentRef}
              digits={digits}
              drawingMode={drawingMode}
              indicatorConfigs={indicatorConfigs}
              overlayRegistry={overlayRegistry}
              extraBottomPadding={extraBottomPadding}
              extraTopPadding={extraTopPadding}
              onPriceUpdateRef={linePriceUpdateRef}
              onServerTimeRef={lineServerTimeRef}
              onTradeCloseRef={lineTradeCloseRef}
              accountCurrency={accountCurrency}
            />
          ) : (
            <CandleChart
              ref={candleChartRef}
              className="w-full h-full"
              style={{ display: 'block' }}
              timeframe={timeframe}
              instrument={instrument}
              payoutPercent={payoutPercent}
              digits={digits}
              activeInstrumentRef={activeInstrumentRef}
              indicatorConfigs={indicatorConfigs}
              drawingMode={drawingMode}
              overlayRegistry={overlayRegistry}
              onInstrumentChange={onInstrumentChange}
              candleMode={candleMode}
              extraBottomPadding={extraBottomPadding}
              extraTopPadding={extraTopPadding}
              showMinMaxLabels={showMinMaxLabels}
              accountCurrency={accountCurrency}
            />
          )}
        </div>
      </ChartErrorBoundary>
    </div>
  );
}
