'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretUp, CaretDown } from '@phosphor-icons/react';

const MIN_SECONDS = 5;
const MAX_SECONDS = 3600;

function secondsToTime(seconds: number): { hours: number; minutes: number; secs: number } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { hours: h, minutes: m, secs: s };
}

function timeToSeconds(hours: number, minutes: number, secs: number): number {
  return hours * 3600 + minutes * 60 + secs;
}

/** Пресеты экспирации: S5 … H1 */
const PRESETS = [
  { label: 'S5', seconds: 5 },
  { label: 'S15', seconds: 15 },
  { label: 'S30', seconds: 30 },
  { label: 'M1', seconds: 60 },
  { label: 'M3', seconds: 180 },
  { label: 'M5', seconds: 300 },
  { label: 'M15', seconds: 900 },
  { label: 'M30', seconds: 1800 },
  { label: 'H1', seconds: 3600 },
];

export function TimeSelectionModal({
  currentSeconds,
  onSelect,
  compact = false,
}: {
  currentSeconds: number;
  onSelect: (seconds: number) => void;
  /** Узкая колонка (мобильная модалка над панелью) */
  compact?: boolean;
}) {
  const t = useTranslations('terminal');
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
    const newH = field === 'h' ? Math.max(0, Math.min(1, h + delta)) : h;
    const newM = field === 'm' ? Math.max(0, Math.min(59, m + delta)) : m;
    const newS = field === 's' ? Math.max(0, Math.min(55, s + delta)) : s;
    commit(newH, newM, newS);
  };

  const selectPreset = (seconds: number) => {
    const clamped = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds));
    const snapped = Math.round(clamped / 5) * 5;
    const tt = secondsToTime(snapped);
    setH(tt.hours);
    setM(tt.minutes);
    setS(tt.secs);
    onSelect(snapped);
  };

  const totalNow = timeToSeconds(h, m, s);

  const btnStep = compact
    ? 'w-full h-7 rounded-md flex items-center justify-center transition-colors duration-100 bg-white/[0.07] hover:bg-white/[0.13] text-white/90 hover:text-white active:scale-95'
    : 'w-full h-8 rounded-lg flex items-center justify-center transition-colors duration-100 bg-white/[0.07] hover:bg-white/[0.13] text-white/90 hover:text-white active:scale-95';

  const btnPresetBase = compact
    ? 'h-8 rounded-md text-[10px] font-semibold transition-all duration-100 active:scale-95 flex items-center justify-center'
    : 'h-9 rounded-lg text-[11px] font-semibold transition-all duration-100 active:scale-95 flex items-center justify-center';

  const colW = compact ? 'w-[34px]' : 'w-[38px]';
  const colGap = compact ? 'gap-0.5' : 'gap-1';
  const digitCls = compact
    ? 'text-lg font-semibold text-white tabular-nums leading-none py-0.5 select-none'
    : 'text-xl font-semibold text-white tabular-nums leading-none py-0.5 select-none';
  const sepCls = compact
    ? 'text-white/35 text-lg font-medium pb-[1.125rem] select-none'
    : 'text-white/35 text-xl font-medium pb-6 select-none';
  const caretCls = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const ColUnit = ({
    value,
    onUp,
    onDown,
  }: {
    value: number;
    onUp: () => void;
    onDown: () => void;
  }) => (
    <div className={`flex flex-col items-center ${colGap} ${colW}`}>
      <button type="button" onClick={onUp} className={btnStep} aria-label={t('time_modal_step_up')}>
        <CaretUp className={caretCls} weight="bold" />
      </button>
      <div className={digitCls}>
        {String(value).padStart(2, '0')}
      </div>
      <button type="button" onClick={onDown} className={btnStep} aria-label={t('time_modal_step_down')}>
        <CaretDown className={caretCls} weight="bold" />
      </button>
    </div>
  );

  const topPad = compact ? 'px-2 pt-2 pb-1' : 'px-2.5 pt-2.5 pb-1.5';
  const rangeTxt = compact ? 'text-[10px] text-white/35 text-center mt-0.5' : 'text-[11px] text-white/35 text-center mt-0.5';
  const intHeader = compact ? 'w-full px-2 py-0.5 flex items-center' : 'w-full px-2.5 py-1 flex items-center';
  const intLabel = compact ? 'text-[10px] font-medium uppercase tracking-wider text-white/40' : 'text-[11px] font-medium uppercase tracking-wider text-white/40';
  const gridPad = compact ? 'px-1.5 pb-1.5 grid grid-cols-3 gap-1' : 'px-2 pb-2 grid grid-cols-3 gap-1.5';

  return (
    <div className="flex flex-col w-full">
      {/* ── Дисплей и шаги - как блок суммы в AmountCalculatorModal ── */}
      <div className={topPad}>
        <div className="flex items-center justify-center gap-0.5">
          <ColUnit value={h} onUp={() => adjust('h', 1)} onDown={() => adjust('h', -1)} />
          <span className={sepCls}>:</span>
          <ColUnit value={m} onUp={() => adjust('m', 1)} onDown={() => adjust('m', -1)} />
          <span className={sepCls}>:</span>
          <ColUnit value={s} onUp={() => adjust('s', 5)} onDown={() => adjust('s', -5)} />
        </div>
        <div className={rangeTxt}>{t('time_modal_range')}</div>
      </div>

      {/* ── Пресеты - как секция «Калькулятор» ── */}
      <div className="border-t border-white/[0.07]">
        <div className={intHeader}>
          <span className={intLabel}>{t('time_modal_intervals')}</span>
        </div>
        <div className={gridPad}>
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
