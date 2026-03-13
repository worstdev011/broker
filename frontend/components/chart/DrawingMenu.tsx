/**
 * DrawingMenu — выпадающее меню инструментов рисования
 * Аналогично IndicatorMenu: одна кнопка, список внутри dropdown
 */

'use client';

import { useState, useRef } from 'react';
import { Star, Pencil } from 'lucide-react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useLocalStorageSet } from '@/lib/hooks/useLocalStorageSet';

export type DrawingModeOption = 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';

interface DrawingMenuProps {
  drawingMode: DrawingModeOption | null;
  onDrawingModeChange: (mode: DrawingModeOption | null) => void;
}

const DRAWING_OPTIONS: { id: DrawingModeOption; label: string }[] = [
  { id: 'horizontal', label: 'Горизонтальная линия' },
  { id: 'vertical', label: 'Вертикальная линия' },
  { id: 'trend', label: 'Трендовая линия' },
  { id: 'rectangle', label: 'Область (прямоугольник)' },
  { id: 'fibonacci', label: 'Фибоначчи' },
  { id: 'parallel-channel', label: 'Параллельный канал' },
  { id: 'ray', label: 'Луч' },
  { id: 'arrow', label: 'Стрелка' },
];


export function DrawingMenu({ drawingMode, onDrawingModeChange }: DrawingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, toggleFavorite] = useLocalStorageSet('drawing-menu-favorites');
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const handleSelect = (id: DrawingModeOption) => {
    const next = drawingMode === id ? null : id;
    onDrawingModeChange(next);
  };

  const favoriteOptions = DRAWING_OPTIONS.filter((opt) => favorites.has(opt.id));
  const otherOptions = DRAWING_OPTIONS.filter((opt) => !favorites.has(opt.id));

  const renderItem = (opt: { id: DrawingModeOption; label: string }) => {
    const isActive = drawingMode === opt.id;
    return (
      <button
        key={opt.id}
        type="button"
        onClick={() => handleSelect(opt.id)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors duration-300 ease-in-out ${
          isActive
            ? 'bg-[#3347ff] text-white border border-[#3347ff]'
            : 'text-gray-300 md:hover:bg-white/8 md:hover:text-white'
        }`}
        title={opt.label}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(opt.id);
          }}
          className="flex-shrink-0 p-0.5 md:hover:bg-white/10 rounded transition-colors duration-300 ease-in-out"
          title={favorites.has(opt.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          <Star
            className={`w-3.5 h-3.5 transition-colors duration-300 ease-in-out ${
              favorites.has(opt.id)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400 md:hover:text-yellow-400'
            }`}
          />
        </button>
        <span>{opt.label}</span>
      </button>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-300 ease-in-out flex items-center justify-center text-white md:hover:bg-white/10"
        title="Рисование"
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <Pencil className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-[calc(50%+90px)] md:-translate-x-1/2 mt-2 rounded-lg shadow-xl min-w-[220px] z-50 overflow-hidden bg-[#1e2a40] border border-white/5">
          <div className="p-2">
            {favoriteOptions.length > 0 && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide rounded-lg mb-1.5">
                  Избранное
                </div>
                <div className="space-y-0.5 mb-2 rounded-lg p-1">
                  {favoriteOptions.map((opt) => renderItem(opt))}
                </div>
              </>
            )}
            {otherOptions.length > 0 && (
              <div className="space-y-0.5 rounded-lg p-1">
                {otherOptions.map((opt) => renderItem(opt))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
