'use client';

import { useState } from 'react';
import { Plus, Minus } from '@phosphor-icons/react';

const MIN_SECONDS = 5;
const MAX_SECONDS = 300;

function secondsToTime(seconds: number): { hours: number; minutes: number; secs: number } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { hours: h, minutes: m, secs: s };
}

function timeToSeconds(hours: number, minutes: number, secs: number): number {
  return hours * 3600 + minutes * 60 + secs;
}

const PRESETS = [
  { label: 'M1', seconds: 60 },
  { label: 'M3', seconds: 180 },
  { label: 'M5', seconds: 300 },
  { label: 'S30', seconds: 30 },
  { label: 'S15', seconds: 15 },
  { label: 'S5', seconds: 5 },
];

export function TimeSelectionModal({
  currentSeconds,
  onSelect,
}: {
  currentSeconds: number;
  onSelect: (seconds: number) => void;
}) {
  const init = secondsToTime(currentSeconds);
  const [h, setH] = useState(init.hours);
  const [m, setM] = useState(init.minutes);
  const [s, setS] = useState(init.secs);

  const commit = (newH: number, newM: number, newS: number) => {
    const total = timeToSeconds(newH, newM, newS);
    const clamped = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, total));
    const snapped = Math.round(clamped / 5) * 5;
    const t = secondsToTime(snapped);
    setH(t.hours);
    setM(t.minutes);
    setS(t.secs);
    onSelect(snapped);
  };

  const adjust = (field: 'h' | 'm' | 's', delta: number) => {
    const newH = field === 'h' ? Math.max(0, Math.min(0, h + delta)) : h;
    const newM = field === 'm' ? Math.max(0, Math.min(4, m + delta)) : m;
    const newS = field === 's' ? Math.max(0, Math.min(55, s + delta)) : s;
    commit(newH, newM, newS);
  };

  const selectPreset = (seconds: number) => {
    const t = secondsToTime(seconds);
    setH(t.hours);
    setM(t.minutes);
    setS(t.secs);
    onSelect(seconds);
  };

  const totalNow = timeToSeconds(h, m, s);

  const btnStep =
    'w-full h-8 rounded-lg flex items-center justify-center transition-colors duration-100 bg-white/[0.07] hover:bg-white/[0.13] text-white active:scale-95';

  const btnPresetBase =
    'h-8 rounded-lg text-xs font-medium transition-all duration-100 active:scale-95 flex items-center justify-center';

  const ColUnit = ({
    value,
    onUp,
    onDown,
  }: {
    value: number;
    onUp: () => void;
    onDown: () => void;
  }) => (
    <div className="flex flex-col items-center gap-1 w-[38px]">
      <button type="button" onClick={onUp} className={btnStep}>
        <Plus className="w-[18px] h-[18px]" weight="fill" />
      </button>
      <div className="text-xl font-semibold text-white tabular-nums leading-none py-0.5 select-none">
        {String(value).padStart(2, '0')}
      </div>
      <button type="button" onClick={onDown} className={btnStep}>
        <Minus className="w-[18px] h-[18px]" weight="fill" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col w-full">
      {/* ── Дисплей и шаги - как блок суммы в AmountCalculatorModal ── */}
      <div className="px-2.5 pt-2.5 pb-1.5">
        <div className="flex items-center justify-center gap-0.5">
          <ColUnit value={h} onUp={() => adjust('h', 1)} onDown={() => adjust('h', -1)} />
          <span className="text-white/35 text-xl font-medium pb-6 select-none">:</span>
          <ColUnit value={m} onUp={() => adjust('m', 1)} onDown={() => adjust('m', -1)} />
          <span className="text-white/35 text-xl font-medium pb-6 select-none">:</span>
          <ColUnit value={s} onUp={() => adjust('s', 5)} onDown={() => adjust('s', -5)} />
        </div>
        <div className="text-[11px] text-white/35 text-center mt-0.5">от 5 сек до 5 мин</div>
      </div>

      {/* ── Пресеты - как секция «Калькулятор» ── */}
      <div className="border-t border-white/[0.07]">
        <div className="w-full px-2.5 py-1 flex items-center">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Интервалы</span>
        </div>
        <div className="px-2 pb-1.5 grid grid-cols-3 gap-1">
          {PRESETS.map((p) => {
            const active = totalNow === p.seconds;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => selectPreset(p.seconds)}
                className={`${btnPresetBase} ${
                  active
                    ? 'bg-[#3347ff] hover:bg-[#2a3de0] text-white'
                    : 'bg-white/[0.07] hover:bg-white/[0.13] text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
