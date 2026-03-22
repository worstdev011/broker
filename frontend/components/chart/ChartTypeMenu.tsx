/**
 * ChartTypeMenu - выпадающее меню для выбора типа графика
 * Свечи/Линия + режимы свечей (Classic/Heikin Ashi/Bars)
 * Иконки из public/images: liner.png, candler.png, barser.png, ashier.png
 */

'use client';

import { useState, useRef } from 'react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import type { ChartType } from './chart.types';
import type { CandleMode } from './internal/candleModes/candleMode.types';

interface ChartTypeMenuProps {
  chartType: ChartType;
  candleMode: CandleMode;
  onChartTypeChange: (type: ChartType) => void;
  onCandleModeChange: (mode: CandleMode) => void;
}

const CHART_OPTIONS: Array<{
  chartType: ChartType;
  candleMode?: CandleMode;
  label: string;
  iconSrc: string;
}> = [
  { chartType: 'line', label: 'Линия', iconSrc: '/images/liner.png' },
  { chartType: 'candles', candleMode: 'classic', label: 'Свечи', iconSrc: '/images/candler.png' },
  { chartType: 'candles', candleMode: 'bars', label: 'Столбцы', iconSrc: '/images/barser.png' },
  { chartType: 'candles', candleMode: 'heikin_ashi', label: 'Heikin Ashi', iconSrc: '/images/ashier.png' },
];

export function ChartTypeMenu({
  chartType,
  candleMode,
  onChartTypeChange,
  onCandleModeChange,
}: ChartTypeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const currentOption = CHART_OPTIONS.find(
    (opt) =>
      opt.chartType === chartType &&
      (chartType === 'line' || opt.candleMode === candleMode)
  );
  const triggerIconSrc = currentOption?.iconSrc ?? '/images/candler.png';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md text-sm font-semibold transition-colors duration-300 ease-in-out flex items-center justify-center text-white md:hover:bg-white/10 px-3.5 py-2"
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
        title={currentOption ? `Тип графика: ${currentOption.label}` : 'Тип графика'}
      >
        <img src={triggerIconSrc} alt="" className="w-5 h-4 object-contain shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-lg shadow-xl z-50 overflow-hidden bg-[#1e2a40] border border-white/5">
          <div className="p-1.5 flex items-center gap-1">
            {CHART_OPTIONS.map((option) => {
              const isActive =
                option.chartType === chartType &&
                (option.candleMode === candleMode ||
                  (!option.candleMode && candleMode === 'classic'));
              return (
                <button
                  key={`${option.chartType}-${option.candleMode || 'classic'}`}
                  type="button"
                  onClick={() => {
                    onChartTypeChange(option.chartType);
                    if (option.candleMode) {
                      onCandleModeChange(option.candleMode);
                    } else if (option.chartType === 'candles') {
                      onCandleModeChange('classic');
                    }
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors duration-300 ease-in-out w-[72px] min-w-[72px] ${
                    isActive
                      ? 'bg-[#3347ff] text-white border border-[#3347ff]'
                      : 'bg-white/10 text-gray-300 md:hover:bg-white/15 md:hover:text-white'
                  }`}
                >
                  <span className="flex items-center justify-center w-8 h-6 shrink-0">
                    <img src={option.iconSrc} alt="" className="max-w-full max-h-full object-contain" />
                  </span>
                  <span className="text-[10px] font-medium whitespace-nowrap">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
