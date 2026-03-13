'use client';

import { useState } from 'react';

export function AmountCalculatorModal({
  currentAmount,
  onSelect,
  onClose,
  payoutPercent,
}: {
  currentAmount: number;
  onSelect: (amount: number) => void;
  onClose: () => void;
  payoutPercent: number;
}) {
  const [display, setDisplay] = useState<string>(String(currentAmount));
  const [multiplier] = useState<number>(2);
  const [isFirstInput, setIsFirstInput] = useState<boolean>(true);

  const handleNumber = (num: string) => {
    if (isFirstInput) {
      setDisplay(num);
      setIsFirstInput(false);
    } else if (display === '0' || display === '0.00') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleDecimal = () => {
    if (isFirstInput) {
      setDisplay('0.');
      setIsFirstInput(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleMultiply = () => {
    const current = Number.parseFloat(display);
    const result = current * multiplier;
    setDisplay(String(result.toFixed(2)));
  };

  const handleDivide = () => {
    const current = Number.parseFloat(display);
    if (multiplier !== 0) {
      const result = current / multiplier;
      setDisplay(String(result.toFixed(2)));
    }
  };

  const handleApply = () => {
    const finalAmount = Number.parseFloat(display);
    if (finalAmount >= 1) {
      onSelect(finalAmount);
    }
  };

  const formatDisplay = (value: string): string => {
    const num = Number.parseFloat(value || '0');
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Display */}
      <div className="bg-white/10 rounded-lg px-2 py-1">
        <div className="text-right text-sm font-bold text-white">
          {formatDisplay(display)}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-0.5">
        <button
          type="button"
          onClick={() => handleNumber('7')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleNumber('8')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleNumber('9')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleNumber('4')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleNumber('5')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleNumber('6')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleNumber('1')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleNumber('2')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleNumber('3')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          3
        </button>
        <button
          type="button"
          onClick={handleDecimal}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleNumber('0')}
          className="h-7 bg-white/10 md:hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-7 bg-red-500/20 md:hover:bg-red-500/30 rounded text-red-400 md:hover:text-red-300 flex items-center justify-center text-lg font-medium transition-colors"
        >
          ⌫
        </button>
      </div>

      {/* Apply Button */}
      <button
        type="button"
        onClick={handleApply}
        className="w-full py-1 bg-[#3347ff] md:hover:bg-[#3347ff]/90 text-white text-xs font-semibold rounded transition-colors"
      >
        Применить
      </button>
    </div>
  );
}
