/**
 * FLOW O4 - Overlay Panel UI (React)
 * Панель активных объектов: название, глаз (показать/скрыть), крест (удалить).
 * Обычный React UI, НЕ canvas. Связь только через Overlay Registry.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Eye, EyeSlash, Trash, Gear } from '@phosphor-icons/react';
import type { Overlay, DrawingOverlay } from './internal/overlay/overlay.types';
import { isDrawingOverlay } from './internal/overlay/overlay.types';

interface OverlayPanelProps {
  overlays: Overlay[];
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onEditIndicator?: (id: string) => void;
  className?: string;
}

export function OverlayPanel({
  overlays,
  onToggleVisibility,
  onRemove,
  onEditIndicator,
  className = '',
}: OverlayPanelProps) {
  const t = useTranslations('terminal');

  if (overlays.length === 0) {
    return null;
  }

  // Функция для получения названия с нумерацией для drawings
  const getDisplayName = (overlay: Overlay): string => {
    if (isDrawingOverlay(overlay)) {
      // Находим все элементы того же типа
      const sameTypeDrawings = overlays.filter(
        (o): o is DrawingOverlay => isDrawingOverlay(o) && o.drawingType === overlay.drawingType
      );
      
      // Если больше одного элемента того же типа, добавляем номер
      if (sameTypeDrawings.length > 1) {
        // Находим позицию текущего элемента среди элементов того же типа
        const number = sameTypeDrawings.findIndex((o) => o.id === overlay.id) + 1;
        return `${overlay.name} #${number}`;
      }
    }
    return overlay.name;
  };

  return (
    <div
      className={`bg-[#0d1e3a]/95 backdrop-blur-sm rounded-lg min-w-[180px] max-h-[150px] overflow-y-auto ${className}`}
      role="list"
      aria-label={t('overlay_panel_aria')}
    >
      <div className="p-1 space-y-0.5">
        {overlays.map((overlay) => {
          const displayName = getDisplayName(overlay);
          const dotColor =
            overlay.type === 'indicator'
              ? (overlay.params?.color as string | undefined)
              : undefined;
          return (
            <div
              key={overlay.id}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md md:hover:bg-white/5 group focus-within:bg-white/5 outline-none"
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                  e.preventDefault();
                  onRemove(overlay.id);
                }
              }}
            >
              {dotColor ? (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-white/15"
                  style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}66` }}
                  aria-hidden
                />
              ) : (
                <span className="w-1.5 shrink-0" aria-hidden />
              )}
              <span className="flex-1 text-[11px] text-gray-200 truncate" title={displayName}>
                {displayName}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 opacity-70 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onToggleVisibility(overlay.id)}
                  className="p-0.5 rounded md:hover:bg-white/10 text-gray-400 md:hover:text-white transition-colors"
                  title={overlay.visible ? t('overlay_hide') : t('overlay_show')}
                  aria-label={overlay.visible ? t('overlay_hide') : t('overlay_show')}
                >
                  {overlay.visible ? (
                    <Eye className="w-3.5 h-3.5" weight="bold" />
                  ) : (
                    <EyeSlash className="w-3.5 h-3.5" weight="bold" />
                  )}
                </button>
                {overlay.type === 'indicator' && onEditIndicator && (
                  <button
                    type="button"
                    onClick={() => onEditIndicator(overlay.id)}
                    className="p-0.5 rounded md:hover:bg-white/10 text-gray-400 md:hover:text-white transition-colors"
                    title={t('overlay_ind_settings')}
                    aria-label={t('overlay_ind_settings')}
                  >
                    <Gear className="w-3.5 h-3.5" weight="bold" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(overlay.id)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-gray-400 md:hover:text-red-400 transition-colors"
                  title={t('overlay_remove')}
                  aria-label={t('overlay_remove')}
                >
                  <Trash className="w-3.5 h-3.5" weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
