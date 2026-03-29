'use client';

import { useState, useRef } from 'react';
import { PencilSimple, SlidersHorizontal, X } from '@phosphor-icons/react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { InstrumentMenu } from '@/components/chart/InstrumentMenu';
import { ChartSettingsMenu } from '@/components/chart/ChartSettingsMenu';
import { IndicatorMenu } from '@/components/chart/IndicatorMenu';
import { DrawingMenu, type DrawingModeOption } from '@/components/chart/DrawingMenu';
import type { IndicatorConfig } from '@/components/chart/internal/indicators/indicator.types';
import type { CandleMode } from '@/components/chart/internal/candleModes/candleMode.types';

type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';
type ChartType = 'candles' | 'line';

interface MobileChartToolbarProps {
  instrument: string;
  timeframe: Timeframe;
  chartType: ChartType;
  candleMode: CandleMode;
  indicatorConfigs: IndicatorConfig[];
  drawingMode: DrawingModeOption | null;
  onInstrumentChange: (instrument: string) => void;
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: ChartType) => void;
  onCandleModeChange: (mode: CandleMode) => void;
  onIndicatorConfigChange: (configs: IndicatorConfig[]) => void;
  onDrawingModeChange: (mode: DrawingModeOption | null) => void;
  /** CSS px offset from bottom — drawer sits above the floating trade panel */
  drawerBottomOffset?: number;
}

export function MobileChartToolbar({
  instrument,
  timeframe,
  chartType,
  candleMode,
  indicatorConfigs,
  drawingMode,
  onInstrumentChange,
  onTimeframeChange,
  onChartTypeChange,
  onCandleModeChange,
  onIndicatorConfigChange,
  onDrawingModeChange,
  drawerBottomOffset = 0,
}: MobileChartToolbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useClickOutside(drawerRef, () => setDrawerOpen(false), drawerOpen);

  const hasActiveIndicator = indicatorConfigs.some(c => c.enabled);
  const isDrawing = drawingMode !== null;

  return (
    <>
      {/* ── Top-left: instrument selector ── */}
      <div
        className="absolute top-2 left-2 z-10"
        data-tour="instrument"
      >
        <div className="bg-[#1e2a40]/90 rounded-lg backdrop-blur-sm">
          <InstrumentMenu instrument={instrument} onInstrumentChange={onInstrumentChange} />
        </div>
      </div>

      {/* ── Right column: chart type + timeframe + indicators + drawing ── */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
        {/* Chart type + Timeframe combined */}
        <div data-tour="timeframe" className="bg-[#1e2a40]/90 rounded-lg backdrop-blur-sm">
          <ChartSettingsMenu
            chartType={chartType}
            candleMode={candleMode}
            timeframe={timeframe}
            onChartTypeChange={onChartTypeChange}
            onCandleModeChange={onCandleModeChange}
            onTimeframeChange={onTimeframeChange}
          />
        </div>

        {/* Indicators */}
        <div className={`rounded-lg backdrop-blur-sm ${hasActiveIndicator ? 'bg-[#3347ff]/80' : 'bg-[#1e2a40]/90'}`}>
          <IndicatorMenu
            indicatorConfigs={indicatorConfigs}
            onConfigChange={onIndicatorConfigChange}
          />
        </div>

        {/* Drawing */}
        <div className={`rounded-lg backdrop-blur-sm ${isDrawing ? 'bg-[#3347ff]/80' : 'bg-[#1e2a40]/90'}`}>
          <DrawingMenu
            drawingMode={drawingMode}
            onDrawingModeChange={onDrawingModeChange}
          />
        </div>
      </div>
    </>
  );
}
