'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

function secondsToTime(seconds: number): { hours: number; minutes: number; secs: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { hours, minutes, secs };
}

function timeToSeconds(hours: number, minutes: number, secs: number): number {
  return hours * 3600 + minutes * 60 + secs;
}

export function TimeSelectionModal({
  currentSeconds,
  onSelect,
  onClose,
}: {
  currentSeconds: number;
  onSelect: (seconds: number) => void;
  onClose: () => void;
}) {
  const { hours, minutes, secs } = secondsToTime(currentSeconds);
  const [timeHours, setTimeHours] = useState<string>(String(hours).padStart(2, '0'));
  const [timeMinutes, setTimeMinutes] = useState<string>(String(minutes).padStart(2, '0'));
  const [timeSeconds, setTimeSeconds] = useState<string>(String(secs).padStart(2, '0'));

  const adjustTime = (field: 'hours' | 'minutes' | 'seconds', delta: number) => {
    let h = Number.parseInt(timeHours || '0', 10);
    let m = Number.parseInt(timeMinutes || '0', 10);
    let s = Number.parseInt(timeSeconds || '0', 10);

    if (field === 'hours') {
      h = Math.max(0, Math.min(23, h + delta));
    } else if (field === 'minutes') {
      m = Math.max(0, Math.min(59, m + delta));
    } else {
      s = Math.max(0, Math.min(59, s + delta));
    }

    const newHours = String(h).padStart(2, '0');
    const newMinutes = String(m).padStart(2, '0');
    const newSecs = String(s).padStart(2, '0');
    
    setTimeHours(newHours);
    setTimeMinutes(newMinutes);
    setTimeSeconds(newSecs);
    
    const totalSeconds = timeToSeconds(h, m, s);
    onSelect(totalSeconds);
  };

  const presetTimes = [
    { label: 'S5', seconds: 5 },
    { label: 'S15', seconds: 15 },
    { label: 'S30', seconds: 30 },
    { label: 'M1', seconds: 60 },
    { label: 'M2', seconds: 120 },
    { label: 'M3', seconds: 180 },
    { label: 'M5', seconds: 300 },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Ручной ввод времени */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 justify-center">
          {/* Часы */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => adjustTime('hours', 1)}
              className="w-10 h-5 flex items-center justify-center text-white md:hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <div className="w-10 h-8 bg-white/10 rounded-lg text-white text-center text-xs flex items-center justify-center font-medium">
              {timeHours}
            </div>
            <button
              type="button"
              onClick={() => adjustTime('hours', -1)}
              className="w-10 h-5 flex items-center justify-center text-white md:hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>

          <span className="text-white text-base font-semibold px-0.5">:</span>

          {/* Минуты */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => adjustTime('minutes', 1)}
              className="w-10 h-5 flex items-center justify-center text-white md:hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <div className="w-10 h-8 bg-white/10 rounded-lg text-white text-center text-xs flex items-center justify-center font-medium">
              {timeMinutes}
            </div>
            <button
              type="button"
              onClick={() => adjustTime('minutes', -1)}
              className="w-10 h-5 flex items-center justify-center text-white md:hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>

          <span className="text-white text-base font-semibold px-0.5">:</span>

          {/* Секунды */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => adjustTime('seconds', 1)}
              className="w-10 h-5 flex items-center justify-center text-white md:hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <div className="w-10 h-8 bg-white/10 rounded-lg text-white text-center text-xs flex items-center justify-center font-medium">
              {timeSeconds}
            </div>
            <button
              type="button"
              onClick={() => adjustTime('seconds', -1)}
              className="w-10 h-5 flex items-center justify-center text-white md:hover:bg-white/20 rounded transition-colors bg-white/10"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Кнопки быстрого выбора */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-gray-400">Быстрый выбор</label>
        <div className="grid grid-cols-3 gap-1.5">
          {presetTimes.map((preset) => {
            const isSelected = currentSeconds === preset.seconds;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onSelect(preset.seconds);
                  const newTime = secondsToTime(preset.seconds);
                  setTimeHours(String(newTime.hours).padStart(2, '0'));
                  setTimeMinutes(String(newTime.minutes).padStart(2, '0'));
                  setTimeSeconds(String(newTime.secs).padStart(2, '0'));
                }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#3347ff] text-white border border-[#3347ff]'
                    : 'bg-white/10 text-gray-300 md:hover:bg-white/20 md:hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
