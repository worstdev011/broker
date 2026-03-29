/**
 * DrawingMenu - выпадающее меню инструментов рисования
 * Аналогично IndicatorMenu: одна кнопка, список внутри dropdown
 */

'use client';

import { useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Star, PencilSimple } from '@phosphor-icons/react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useLocalStorageSet } from '@/lib/hooks/useLocalStorageSet';

export type DrawingModeOption = 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';

const DRAWING_IDS: DrawingModeOption[] = [
  'horizontal',
  'vertical',
  'trend',
  'rectangle',
  'fibonacci',
  'parallel-channel',
  'ray',
  'arrow',
];

const DRAW_LABEL_KEYS: Record<DrawingModeOption, string> = {
  horizontal: 'draw_horizontal',
  vertical: 'draw_vertical',
  trend: 'draw_trend',
  rectangle: 'draw_rectangle',
  fibonacci: 'draw_fibonacci',
  'parallel-channel': 'draw_parallel',
  ray: 'draw_ray',
  arrow: 'draw_arrow',
};

interface DrawingMenuProps {
  drawingMode: DrawingModeOption | null;
  onDrawingModeChange: (mode: DrawingModeOption | null) => void;
}

export function DrawingMenu({ drawingMode, onDrawingModeChange }: DrawingMenuProps) {
  const t = useTranslations('terminal');
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, toggleFavorite] = useLocalStorageSet('drawing-menu-favorites');
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const options = useMemo(
    () =>
      DRAWING_IDS.map((id) => ({
        id,
        label: t(DRAW_LABEL_KEYS[id] as 'draw_horizontal'),
      })),
    [t],
  );

  const handleSelect = (id: DrawingModeOption) => {
    const next = drawingMode === id ? null : id;
    onDrawingModeChange(next);
  };

  const favoriteOptions = options.filter((opt) => favorites.has(opt.id));
  const otherOptions = options.filter((opt) => !favorites.has(opt.id));

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
          title={favorites.has(opt.id) ? t('fav_remove') : t('fav_add')}
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
        title={t('menu_drawing')}
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <PencilSimple className="w-4 h-4" weight="bold" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-[calc(50%+90px)] md:-translate-x-1/2 mt-2 rounded-lg shadow-xl min-w-[220px] z-50 overflow-hidden bg-[#1e2a40] border border-white/5">
          <div className="p-2">
            {favoriteOptions.length > 0 && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide rounded-lg mb-1.5">
                  {t('favorites_section')}
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
