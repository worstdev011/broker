/**
 * ChartSettingsMenu — единая кнопка для выбора типа графика + таймфрейма.
 * Открывает одну панель с двумя секциями: тип и таймфрейм.
 */

'use client';

import { useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import type { ChartType } from './chart.types';
import type { CandleMode } from './internal/candleModes/candleMode.types';

type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

interface ChartSettingsMenuProps {
  chartType: ChartType;
  candleMode: CandleMode;
  timeframe: Timeframe;
  onChartTypeChange: (type: ChartType) => void;
  onCandleModeChange: (mode: CandleMode) => void;
  onTimeframeChange: (tf: Timeframe) => void;
}

const CHART_OPTION_DEFS: Array<{
  chartType: ChartType;
  candleMode?: CandleMode;
  labelKey: 'chart_line' | 'chart_candles' | 'chart_bars' | 'chart_heikin';
  iconSrc: string;
}> = [
  { chartType: 'line',    labelKey: 'chart_line',    iconSrc: '/images/liner.png'   },
  { chartType: 'candles', candleMode: 'classic',     labelKey: 'chart_candles', iconSrc: '/images/candler.png' },
  { chartType: 'candles', candleMode: 'bars',        labelKey: 'chart_bars',    iconSrc: '/images/barser.png'  },
  { chartType: 'candles', candleMode: 'heikin_ashi', labelKey: 'chart_heikin',  iconSrc: '/images/ashier.png'  },
];

const TF_IDS: Timeframe[] = [
  '5s', '10s', '15s', '30s',
  '1m', '2m', '3m', '5m', '10m', '15m', '30m',
  '1h', '4h', '1d',
];

const TF_DISPLAY: Record<Timeframe, string> = {
  '5s': 'S5', '10s': 'S10', '15s': 'S15', '30s': 'S30',
  '1m': 'M1', '2m': 'M2', '3m': 'M3', '5m': 'M5',
  '10m': 'M10', '15m': 'M15', '30m': 'M30',
  '1h': 'H1', '4h': 'H4', '1d': 'D1',
};

export function ChartSettingsMenu({
  chartType,
  candleMode,
  timeframe,
  onChartTypeChange,
  onCandleModeChange,
  onTimeframeChange,
}: ChartSettingsMenuProps) {
  const t = useTranslations('terminal');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const chartOptions = useMemo(
    () => CHART_OPTION_DEFS.map((o) => ({ ...o, label: t(o.labelKey) })),
    [t],
  );

  const timeframes = useMemo(
    () => TF_IDS.map((id) => ({ id, display: TF_DISPLAY[id] })),
    [],
  );

  const currentChartOption = chartOptions.find(
    (opt) => opt.chartType === chartType && (chartType === 'line' || opt.candleMode === candleMode),
  );
  const currentIconSrc = currentChartOption?.iconSrc ?? '/images/candler.png';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button: only chart type icon */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center px-3.5 py-2 rounded-md text-white transition-colors duration-200 md:hover:bg-white/10"
        style={{ width: '44px', height: '36px', minWidth: '44px' }}
        title={t('menu_chart_type')}
      >
        <img src={currentIconSrc} alt="" className="w-5 h-4 object-contain shrink-0" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-1/2 -translate-x-[calc(50%+10px)] md:-translate-x-1/2 mt-2 rounded-xl shadow-2xl z-50 bg-[#1e2a40] border border-white/[0.07] w-[min(100vw-2rem,360px)] md:w-[min(100vw-1.5rem,404px)] shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Chart type row (без заголовка) ── */}
          <div className="px-2.5 pt-2.5 pb-2 md:px-3 md:pt-3 md:pb-2.5">
            <div className="grid grid-cols-4 gap-1.5 md:gap-2 w-full">
              {chartOptions.map((option) => {
                const isActive =
                  option.chartType === chartType &&
                  (option.candleMode === candleMode || (!option.candleMode && chartType === 'line'));
                return (
                  <button
                    key={`${option.chartType}-${option.candleMode ?? 'line'}`}
                    type="button"
                    onClick={() => {
                      onChartTypeChange(option.chartType);
                      if (option.candleMode) {
                        onCandleModeChange(option.candleMode);
                      } else if (option.chartType === 'candles') {
                        onCandleModeChange('classic');
                      }
                    }}
                    title={option.label}
                    className={`flex flex-col items-center justify-center gap-1 md:gap-1.5 py-1.5 md:py-2 px-0.5 md:px-1 min-h-0 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-[#3347ff] text-white'
                        : 'bg-white/[0.07] text-gray-300 md:hover:bg-white/[0.13] md:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center justify-center w-full h-6 md:h-7 shrink-0">
                      <img src={option.iconSrc} alt="" className="max-w-full max-h-full object-contain" />
                    </span>
                    <span className="text-[10px] font-medium text-center leading-tight px-0.5">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {chartType !== 'line' && (
          <>
          <div className="mx-2.5 md:mx-3 border-t border-white/[0.07]" />

          {/* ── Timeframe section ── */}
          <div className="px-2.5 pt-2 pb-2.5 md:px-3 md:pt-2.5 md:pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1.5 md:mb-2 select-none">
              {t('menu_timeframe')}
            </p>
            <div className="grid grid-cols-7 gap-0.5 md:gap-1">
              {timeframes.map((tf) => {
                const isActive = timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => {
                      onTimeframeChange(tf.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-center py-1 md:py-1.5 rounded-md md:rounded-lg text-[11px] font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-[#3347ff] text-white'
                        : 'bg-white/[0.07] text-gray-300 md:hover:bg-white/[0.13] md:hover:text-white'
                    }`}
                  >
                    {tf.display}
                  </button>
                );
              })}
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}
