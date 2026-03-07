/**
 * IndicatorMenu - меню для управления индикаторами
 * 
 * Позволяет включать/выключать каждый индикатор отдельно
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star, Activity } from 'lucide-react';
import type { IndicatorConfig } from './internal/indicators/indicator.types';

const INDICATOR_FAVORITES_KEY = 'indicator-menu-favorites';

interface IndicatorMenuProps {
  indicatorConfigs: IndicatorConfig[];
  onConfigChange: (configs: IndicatorConfig[]) => void;
}

function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(INDICATOR_FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set: Set<string>) {
  try {
    localStorage.setItem(INDICATOR_FAVORITES_KEY, JSON.stringify([...set]));
  } catch {}
}

export function IndicatorMenu({ indicatorConfigs, onConfigChange }: IndicatorMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
    saveFavorites(next);
  };

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (target && menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [isOpen]);

  // Проверяем, есть ли хотя бы один включенный индикатор
  const hasEnabledIndicators = indicatorConfigs.some(c => c.enabled);

  const handleToggleIndicator = (id: string) => {
    const newConfigs = indicatorConfigs.map(config => 
      config.id === id 
        ? { ...config, enabled: !config.enabled }
        : config
    );
    onConfigChange(newConfigs);
  };

  const getIndicatorLabel = (config: IndicatorConfig): string => {
    // Убираем параметры в скобках, оставляем только название типа
    if (config.type === 'Stochastic') {
      return 'Stochastic';
    }
    if (config.type === 'BollingerBands') {
      return 'Боллинджер';
    }
    if (config.type === 'AwesomeOscillator') {
      return 'Awesome Oscillator';
    }
    if (config.type === 'MACD') {
      return 'MACD';
    }
    if (config.type === 'KeltnerChannels') {
      return 'Кельтнер';
    }
    if (config.type === 'Ichimoku') {
      return 'Ишимоку';
    }
    if (config.type === 'ATR') {
      return 'ATR';
    }
    if (config.type === 'ADX') {
      return 'ADX';
    }
    return config.type;
  };

  const favoriteConfigs = indicatorConfigs.filter((c) => favorites.has(c.id));
  const otherConfigs = indicatorConfigs.filter((c) => !favorites.has(c.id));

  const renderIndicatorItem = (config: IndicatorConfig) => {
    const isActive = config.enabled || false;
    return (
      <button
        key={config.id}
        type="button"
        onClick={() => handleToggleIndicator(config.id)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
          isActive
            ? 'bg-[#3347ff] text-white border border-[#3347ff]'
            : 'text-gray-300 md:hover:bg-white/8 md:hover:text-white'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(config.id);
          }}
          className="flex-shrink-0 p-0.5 md:hover:bg-white/10 rounded transition-colors"
          title={favorites.has(config.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          <Star
            className={`w-3.5 h-3.5 transition-colors ${
              favorites.has(config.id)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400 md:hover:text-yellow-400'
            }`}
          />
        </button>
        <span>{getIndicatorLabel(config)}</span>
      </button>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Кнопка открытия меню */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center text-white md:hover:bg-white/10"
        title="Индикаторы"
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <Activity className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-[calc(50%+36px)] md:-translate-x-1/2 mt-2 rounded-lg shadow-xl min-w-[200px] z-50 overflow-hidden bg-[#091C56] border border-white/5">
          <div className="p-2">
            {favoriteConfigs.length > 0 && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide rounded-lg mb-1.5">
                  Избранное
                </div>
                <div className="space-y-0.5 mb-2 rounded-lg p-1">
                  {favoriteConfigs.map((config) => renderIndicatorItem(config))}
                </div>
              </>
            )}
            {otherConfigs.length > 0 && (
              <div className="space-y-0.5 rounded-lg p-1">
                {otherConfigs.map((config) => renderIndicatorItem(config))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
