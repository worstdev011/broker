/**
 * ChartContainer - switches between chart types (candle / line).
 * Handles loading overlay, error state.
 *
 * Chart data is initialized via WS `chart:init` (not HTTP snapshot).
 * The loading overlay hides automatically once the first frame renders.
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CandleChart, type CandleChartRef } from './candle/CandleChart';
import { LineChart, type LineChartRef } from './line/LineChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import type { ChartType } from './chart.types';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { OverlayRegistryParams } from './useChart';
import type { CandleMode } from './internal/candleModes/candleMode.types';

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
}

const LOADER_STYLES = `
@keyframes chart-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
@keyframes chart-bar-rise {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}
`;

function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#061230',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Animated bar chart icon */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
          {[0.6, 1.0, 0.45, 0.85, 0.55].map((h, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 32 * h,
                borderRadius: 2,
                background: `rgba(38, 166, 154, ${0.4 + h * 0.4})`,
                transformOrigin: 'bottom',
                animation: `chart-bar-rise 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
        <span
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            letterSpacing: '0.5px',
            animation: 'chart-pulse 1.6s ease-in-out infinite',
          }}
        >
          Loading chart
        </span>
      </div>
      <style>{LOADER_STYLES}</style>
    </div>
  );
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
}: ChartContainerProps) {
  const candleChartRef = useRef<CandleChartRef>(null);
  const lineChartRef = useRef<LineChartRef>(null);
  const [lineReady, setLineReady] = useState(false);
  const [candleReady, setCandleReady] = useState(false);

  useEffect(() => {
    onCandleChartRef?.(candleChartRef.current);
  }, [onCandleChartRef, type]);

  useEffect(() => {
    onLineChartRef?.(lineChartRef.current);
  }, [onLineChartRef, type]);

  const handleLineReady = useCallback(() => {
    setLineReady(true);
  }, []);

  const handleCandleReady = useCallback(() => {
    setCandleReady(true);
  }, []);

  const isLine = type === 'line';
  const showLoading = isLine ? !lineReady : !candleReady;

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
              onReady={handleLineReady}
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
              onReady={handleCandleReady}
            />
          )}
        </div>
      </ChartErrorBoundary>

      <LoadingOverlay visible={showLoading} />
    </div>
  );
}
