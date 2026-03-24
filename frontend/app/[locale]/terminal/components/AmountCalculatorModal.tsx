'use client';

import { useEffect, useState } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';

export function AmountCalculatorModal({
  currentAmount,
  onSelect,
  payoutPercent,
  currency = 'USD',
}: {
  currentAmount: number;
  onSelect: (amount: number) => void;
  payoutPercent: number;
  currency?: string;
}) {
  const [display, setDisplay] = useState<string>(String(currentAmount));
  const [multiplier] = useState<number>(2);
  const [isFirstInput, setIsFirstInput] = useState<boolean>(true);
  const [showKeypad, setShowKeypad] = useState<boolean>(true);

  const handleNumber = (num: string) => {
    if (isFirstInput) {
      setDisplay(num);
      setIsFirstInput(false);
    } else if (display === '0') {
      setDisplay(num);
    } else {
      if (display.includes('.') && display.split('.')[1]!.length >= 2) return;
      setDisplay(display + num);
    }
  };

  const handleDecimal = () => {
    if (isFirstInput) {
      setDisplay('0.');
      setIsFirstInput(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    setIsFirstInput(false);
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleMultiply = () => {
    const result = Number.parseFloat(display) * multiplier;
    setDisplay(String(Math.min(50000, result)));
    setIsFirstInput(true);
  };

  const handleDivide = () => {
    const result = Number.parseFloat(display) / multiplier;
    setDisplay(String(Math.max(1, result)));
    setIsFirstInput(true);
  };

  useEffect(() => {
    const finalAmount = Number.parseFloat(display);
    if (Number.isFinite(finalAmount) && finalAmount >= 1) {
      onSelect(Math.min(50000, finalAmount));
    }
  }, [display, onSelect]);

  const numValue = Number.parseFloat(display) || 0;
  const profit = ((numValue * payoutPercent) / 100).toFixed(2);

  const btnBase =
    'h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors duration-100 select-none active:scale-95';
  const btnNum =
    `${btnBase} bg-white/[0.07] hover:bg-white/[0.13] text-white`;
  const btnDel =
    `${btnBase} bg-white/[0.07] hover:bg-red-500/20 text-red-400`;

  return (
    <div className="flex flex-col w-full">
      {/* ── Display ── */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-semibold text-white leading-tight truncate">
            {display} <span className="text-base font-normal text-white/50">{currency}</span>
          </div>
          <div className="text-[11px] text-white/35 mt-0.5">
            прибыль +{profit} {currency}
          </div>
        </div>

        {/* × ÷ buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={handleMultiply}
            className="w-7 h-7 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white text-base font-bold flex items-center justify-center transition-colors"
            title={`× ${multiplier}`}
          >
            ×
          </button>
          <button
            type="button"
            onClick={handleDivide}
            className="w-7 h-7 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white text-base font-bold flex items-center justify-center transition-colors"
            title={`÷ ${multiplier}`}
          >
            ÷
          </button>
        </div>

        {/* Multiplier badge */}
        <div className="w-7 h-[58px] rounded-md bg-white/[0.08] flex items-center justify-center text-base font-bold text-white/80 shrink-0">
          {multiplier}
        </div>
      </div>

      {/* ── Калькулятор section ── */}
      <div className="border-t border-white/[0.07]">
        <button
          type="button"
          onClick={() => setShowKeypad((v) => !v)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-white/40 hover:text-white/60 transition-colors"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider">Калькулятор</span>
          {showKeypad
            ? <CaretUp className="w-[18px] h-[18px]" weight="fill" />
            : <CaretDown className="w-[18px] h-[18px]" weight="fill" />}
        </button>

        {showKeypad && (
          <div className="px-2 pb-2 grid grid-cols-3 gap-1">
            {['7','8','9','4','5','6','1','2','3'].map((n) => (
              <button key={n} type="button" onClick={() => handleNumber(n)} className={btnNum}>{n}</button>
            ))}
            <button type="button" onClick={handleDecimal} className={btnNum}>.</button>
            <button type="button" onClick={() => handleNumber('0')} className={btnNum}>0</button>
            <button type="button" onClick={handleBackspace} className={btnDel}>
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
