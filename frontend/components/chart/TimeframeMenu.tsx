/**
 * TimeframeMenu - выпадающее меню для выбора таймфрейма
 */

'use client';

import { useState, useRef } from 'react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';

type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

interface TimeframeMenuProps {
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

const TIMEFRAMES: { id: Timeframe; label: string; display: string }[] = [
  { id: '5s', label: '5 секунд', display: 'S5' },
  { id: '10s', label: '10 секунд', display: 'S10' },
  { id: '15s', label: '15 секунд', display: 'S15' },
  { id: '30s', label: '30 секунд', display: 'S30' },
  { id: '1m', label: '1 минута', display: 'M1' },
  { id: '2m', label: '2 минуты', display: 'M2' },
  { id: '3m', label: '3 минуты', display: 'M3' },
  { id: '5m', label: '5 минут', display: 'M5' },
  { id: '10m', label: '10 минут', display: 'M10' },
  { id: '15m', label: '15 минут', display: 'M15' },
  { id: '30m', label: '30 минут', display: 'M30' },
  { id: '1h', label: '1 час', display: 'H1' },
  { id: '4h', label: '4 часа', display: 'H4' },
  { id: '1d', label: '1 день', display: 'D1' },
];

export function TimeframeMenu({ timeframe, onTimeframeChange }: TimeframeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const currentTimeframe = TIMEFRAMES.find(tf => tf.id === timeframe);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-300 ease-in-out flex items-center justify-center text-white md:hover:bg-white/10"
        title="Таймфрейм"
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <span className="text-xs font-semibold leading-none">{currentTimeframe?.display || timeframe}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-[calc(50%+36px)] md:-translate-x-1/2 mt-2 rounded-lg shadow-xl z-50 w-[340px] overflow-hidden bg-[#1e2a40] border border-white/5">
          <div className="p-2 grid grid-cols-7 gap-1.5">
            {TIMEFRAMES.map((tf) => {
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
