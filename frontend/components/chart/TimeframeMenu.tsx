/**
 * TimeframeMenu - выпадающее меню для выбора таймфрейма
 */

'use client';

import { useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useClickOutside } from '@/lib/hooks/useClickOutside';

type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

interface TimeframeMenuProps {
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

const TF_IDS: Timeframe[] = [
  '5s',
  '10s',
  '15s',
  '30s',
  '1m',
  '2m',
  '3m',
  '5m',
  '10m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
];

const TF_DISPLAY: Record<Timeframe, string> = {
  '5s': 'S5',
  '10s': 'S10',
  '15s': 'S15',
  '30s': 'S30',
  '1m': 'M1',
  '2m': 'M2',
  '3m': 'M3',
  '5m': 'M5',
  '10m': 'M10',
  '15m': 'M15',
  '30m': 'M30',
  '1h': 'H1',
  '4h': 'H4',
  '1d': 'D1',
};

function tfLabelKey(id: Timeframe): string {
  return `tf_${id}` as const;
}

export function TimeframeMenu({ timeframe, onTimeframeChange }: TimeframeMenuProps) {
  const t = useTranslations('terminal');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const timeframes = useMemo(
    () =>
      TF_IDS.map((id) => ({
        id,
        label: t(tfLabelKey(id) as 'tf_5s'),
        display: TF_DISPLAY[id],
      })),
    [t],
  );

  const currentTimeframe = timeframes.find((tf) => tf.id === timeframe);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-300 ease-in-out flex items-center justify-center text-white md:hover:bg-white/10"
        title={t('menu_timeframe')}
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <span className="text-xs font-semibold leading-none">{currentTimeframe?.display || timeframe}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-[calc(50%+36px)] md:-translate-x-1/2 mt-2 rounded-lg shadow-xl z-50 w-[340px] overflow-hidden bg-[#1e2a40] border border-white/5">
          <div className="p-2 grid grid-cols-7 gap-1.5">
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
                  className={`flex items-center justify-center px-1 py-1.5 rounded-lg text-[11px] transition-colors duration-300 ease-in-out ${
                    isActive
                      ? 'bg-[#3347ff] text-white border border-[#3347ff]'
                      : 'bg-white/10 text-gray-300 md:hover:bg-white/15 md:hover:text-white'
                  }`}
                  title={tf.label}
                >
                  <span>{tf.display}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
