/**
 * ChartCanvas - публичный React-компонент графика
 * 
 * Роль: только DOM + canvas
 * НЕ содержит логики
 */

'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useChart } from './useChart';
import type { CandleMode } from './internal/candleModes/candleMode.types';
import type { IndicatorConfig } from './internal/indicators/indicator.types';

interface ChartCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  timeframe?: string;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
}

export interface ChartCanvasRef {
  setCandleMode: (mode: CandleMode) => void;
  getCandleMode: () => CandleMode;
}

export const ChartCanvas = forwardRef<ChartCanvasRef, ChartCanvasProps>(
  ({ className, style, timeframe = '5s', indicatorConfigs = [], drawingMode = null }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartApi = useChart({ canvasRef, timeframe, indicatorConfigs, drawingMode });

    useImperativeHandle(ref, () => ({
      setCandleMode: chartApi.setCandleMode,
      getCandleMode: chartApi.getCandleMode,
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: 'block', ...style }}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

ChartCanvas.displayName = 'ChartCanvas';
