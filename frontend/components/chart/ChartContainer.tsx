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
@keyframes ct-fadeout {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes ct-candle-rise {
  0%   { transform: scaleY(0); opacity: 0; }
  60%  { opacity: 1; }
  100% { transform: scaleY(1); opacity: 1; }
}
@keyframes ct-wick {
  0%   { opacity: 0; transform: scaleY(0); }
  100% { opacity: 1; transform: scaleY(1); }
}
@keyframes ct-line-draw {
  0%   { stroke-dashoffset: 320; opacity: 0.3; }
  20%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes ct-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.6); opacity: 0.6; }
}
@keyframes ct-grid-fade {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ct-label-fade {
  0%   { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

const BULL = '#45b833';
const BEAR = '#ff3d1f';

const CANDLES = [
  { x: 18,  bodyY: 52, bodyH: 28, wickY1: 44, wickY2: 88,  bull: false, delay: 0    },
  { x: 38,  bodyY: 38, bodyH: 32, wickY1: 30, wickY2: 78,  bull: true,  delay: 0.08 },
  { x: 58,  bodyY: 44, bodyH: 20, wickY1: 36, wickY2: 74,  bull: false, delay: 0.16 },
  { x: 78,  bodyY: 28, bodyH: 36, wickY1: 20, wickY2: 72,  bull: true,  delay: 0.24 },
  { x: 98,  bodyY: 34, bodyH: 22, wickY1: 26, wickY2: 66,  bull: true,  delay: 0.32 },
  { x: 118, bodyY: 48, bodyH: 30, wickY1: 38, wickY2: 86,  bull: false, delay: 0.40 },
  { x: 138, bodyY: 22, bodyH: 38, wickY1: 14, wickY2: 68,  bull: true,  delay: 0.48 },
  { x: 158, bodyY: 30, bodyH: 26, wickY1: 22, wickY2: 62,  bull: true,  delay: 0.56 },
];

function LoadingOverlay({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!visible) {
      // короткий fadeout — не задерживаем показ графика
      const timer = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(timer);
    } else {
      setMounted(true);
    }
  }, [visible]);

  if (!mounted) return null;

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
        animation: !visible ? 'ct-fadeout 0.18s ease forwards' : undefined,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

        {/* Chart animation */}
        <svg width="180" height="110" viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Grid lines */}
          {[28, 55, 82].map((y, i) => (
            <line
              key={y}
              x1="8" y1={y} x2="172" y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              style={{ animation: `ct-grid-fade 0.4s ease ${i * 0.1}s both` }}
            />
          ))}

          {/* Candlesticks */}
          {CANDLES.map((c, i) => (
            <g key={i} style={{ transformOrigin: `${c.x}px 110px` }}>
              {/* Wick */}
              <line
                x1={c.x} y1={c.wickY1} x2={c.x} y2={c.wickY2}
                stroke={c.bull ? BULL : BEAR}
                strokeOpacity={0.55}
                strokeWidth="1.5"
                style={{
                  transformOrigin: `${c.x}px ${(c.wickY1 + c.wickY2) / 2}px`,
                  animation: `ct-wick 0.35s ease ${c.delay + 0.1}s both`,
                }}
              />
              {/* Body */}
              <rect
                x={c.x - 6} y={c.bodyY} width={12} height={c.bodyH}
                rx="2"
                fill={c.bull ? BULL : BEAR}
                opacity={0.9}
                style={{
                  transformOrigin: `${c.x}px ${c.bodyY + c.bodyH}px`,
                  animation: `ct-candle-rise 0.45s cubic-bezier(0.34,1.56,0.64,1) ${c.delay}s both`,
                }}
              />
            </g>
          ))}

          {/* Price line overlay */}
          <polyline
            points="18,66 38,54 58,58 78,46 98,50 118,64 138,40 158,44 172,38"
            stroke="rgba(123,143,255,0.7)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="320"
            style={{ animation: 'ct-line-draw 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s both' }}
          />

          {/* Live dot */}
          <circle
            cx="172" cy="38" r="3"
            fill="#7b8fff"
            style={{ animation: 'ct-dot-pulse 1.2s ease-in-out 1.4s infinite' }}
          />
          <circle cx="172" cy="38" r="5" fill="rgba(123,143,255,0.2)"
            style={{ animation: 'ct-dot-pulse 1.2s ease-in-out 1.4s infinite' }}
          />
        </svg>

        {/* Loading text + dots */}
        <span
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 12,
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            letterSpacing: '0.5px',
            animation: 'ct-label-fade 0.5s ease 0.8s both',
          }}
        >
          Загрузка
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
