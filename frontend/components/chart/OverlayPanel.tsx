/**
 * FLOW O4 — Overlay Panel UI (React)
 * Панель активных объектов: название, глаз (показать/скрыть), крест (удалить).
 * Обычный React UI, НЕ canvas. Связь только через Overlay Registry.
 */

'use client';

import { Eye, EyeOff, Trash2, Settings } from 'lucide-react';
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
      className={`bg-[#061230]/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg min-w-[180px] max-h-[150px] overflow-y-auto ${className}`}
      role="list"
      aria-label="Активные объекты на графике"
    >
      <div className="p-1 space-y-0.5">
        {overlays.map((overlay) => {
          const displayName = getDisplayName(overlay);
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
              <span className="flex-1 text-[11px] text-gray-200 truncate" title={displayName}>
                {displayName}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 opacity-70 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onToggleVisibility(overlay.id)}
                  className="p-0.5 rounded md:hover:bg-white/10 text-gray-400 md:hover:text-white transition-colors"
                  title={overlay.visible ? 'Скрыть' : 'Показать'}
                  aria-label={overlay.visible ? 'Скрыть' : 'Показать'}
                >
                  {overlay.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                </button>
                {overlay.type === 'indicator' && onEditIndicator && (
                  <button
                    type="button"
                    onClick={() => onEditIndicator(overlay.id)}
                    className="p-0.5 rounded md:hover:bg-white/10 text-gray-400 md:hover:text-white transition-colors"
                    title="Настройки индикатора"
                    aria-label="Настройки индикатора"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(overlay.id)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-gray-400 md:hover:text-red-400 transition-colors"
                  title="Удалить"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
