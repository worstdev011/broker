/**
 * ChartContainer - переключатель между типами графиков
 * 
 * FLOW L4: Chart type switcher
 * Loading overlay, error state, fade-in transition
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CandleChart, type CandleChartRef } from './candle/CandleChart';
import { LineChart, type LineChartRef } from './line/LineChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import type { ChartType } from './chart.types';
import type { TerminalSnapshot } from '@/types/terminal';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { OverlayRegistryParams } from './useChart';
import type { CandleMode } from './internal/candleModes/candleMode.types';

interface ChartContainerProps {
  type: ChartType;
  candleMode?: CandleMode;
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string;
  snapshot?: TerminalSnapshot | null;
  snapshotLoading?: boolean;
  snapshotError?: string | null;
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
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease-out',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: '2.5px solid rgba(99,130,255,0.15)',
            borderTopColor: 'rgba(99,130,255,0.7)',
            borderRadius: '50%',
            animation: 'chart-spinner 0.7s linear infinite',
          }}
        />
        <span style={{ color: '#5a6a8a', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
          Loading chart…
        </span>
      </div>
      <style>{`@keyframes chart-spinner { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorOverlay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        zIndex: 10,
        gap: 12,
      }}
    >
      <span style={{ color: '#8888aa', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>
        {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '6px 18px',
            borderRadius: 6,
            border: '1px solid #444466',
            background: '#2a2a4e',
            color: '#ccccee',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ChartContainer({
  type,
  candleMode = 'classic',
  className,
  style,
  timeframe,
  snapshot,
  snapshotLoading,
  snapshotError,
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
}: ChartContainerProps) {
  const candleChartRef = useRef<CandleChartRef>(null);
  const lineChartRef = useRef<LineChartRef>(null);
  const [lineReady, setLineReady] = useState(false);

  useEffect(() => {
    onCandleChartRef?.(candleChartRef.current);
  }, [onCandleChartRef, type]);

  useEffect(() => {
    onLineChartRef?.(lineChartRef.current);
  }, [onLineChartRef, type]);

  const handleLineReady = useCallback(() => {
    setLineReady(true);
  }, []);

  const isLine = type === 'line';
  const showLoading = isLine
    ? !lineReady
    : (snapshotLoading || !snapshot);

  const showError = !isLine && !snapshotLoading && !!snapshotError && !snapshot;

  return (
    <div className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      <ChartErrorBoundary>
        <div
          style={{
            width: '100%',
            height: '100%',
            opacity: showLoading || showError ? 0 : 1,
            transition: 'opacity 200ms ease-in',
          }}
        >
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
              onReady={handleLineReady}
            />
          ) : (
            <CandleChart
              ref={candleChartRef}
              className="w-full h-full"
              style={{ display: 'block' }}
              timeframe={timeframe}
              snapshot={snapshot}
              instrument={instrument}
              payoutPercent={payoutPercent}
              digits={digits}
              activeInstrumentRef={activeInstrumentRef}
              indicatorConfigs={indicatorConfigs}
              drawingMode={drawingMode}
              overlayRegistry={overlayRegistry}
              onInstrumentChange={onInstrumentChange}
              candleMode={candleMode}
            />
          )}
        </div>
      </ChartErrorBoundary>

      {showError && (
        <ErrorOverlay
          message={snapshotError || 'Failed to load chart data'}
          onRetry={() => window.location.reload()}
        />
      )}

      <LoadingOverlay visible={!showError && showLoading} />
    </div>
  );
}
