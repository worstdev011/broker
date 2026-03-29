/**
 * IndicatorMenu - меню для управления индикаторами
 *
 * Позволяет включать/выключать каждый индикатор отдельно
 */

'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Star, SlidersHorizontal, X } from '@phosphor-icons/react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useLocalStorageSet } from '@/lib/hooks/useLocalStorageSet';
import type { IndicatorConfig, IndicatorType } from './internal/indicators/indicator.types';

const INDICATOR_LABEL_KEYS: Record<IndicatorType, string> = {
  SMA: 'ind_menu_sma',
  EMA: 'ind_menu_ema',
  RSI: 'ind_menu_rsi',
  Stochastic: 'ind_menu_stochastic',
  Momentum: 'ind_menu_momentum',
  AwesomeOscillator: 'ind_menu_awesome',
  MACD: 'ind_menu_macd',
  BollingerBands: 'ind_menu_bollinger',
  KeltnerChannels: 'ind_menu_keltner',
  Ichimoku: 'ind_menu_ichimoku',
  ATR: 'ind_menu_atr',
  ADX: 'ind_menu_adx',
};

interface IndicatorMenuProps {
  indicatorConfigs: IndicatorConfig[];
  onConfigChange: (configs: IndicatorConfig[]) => void;
}

export function IndicatorMenu({ indicatorConfigs, onConfigChange }: IndicatorMenuProps) {
  const t = useTranslations('terminal');
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, toggleFavorite] = useLocalStorageSet('indicator-menu-favorites');
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const hasEnabledIndicators = indicatorConfigs.some((c) => c.enabled);

  const handleToggleIndicator = (id: string) => {
    const newConfigs = indicatorConfigs.map((config) =>
      config.id === id ? { ...config, enabled: !config.enabled } : config,
    );
    onConfigChange(newConfigs);
  };

  const handleDisableIndicator = (id: string) => {
    const newConfigs = indicatorConfigs.map((config) =>
      config.id === id ? { ...config, enabled: false } : config,
    );
    onConfigChange(newConfigs);
  };

  const getIndicatorLabel = (config: IndicatorConfig): string =>
    t(INDICATOR_LABEL_KEYS[config.type] as 'ind_menu_sma');

  const favoriteConfigs = indicatorConfigs.filter((c) => favorites.has(c.id));
  const otherConfigs = indicatorConfigs.filter((c) => !favorites.has(c.id));

  const renderIndicatorItem = (config: IndicatorConfig) => {
    const isActive = config.enabled || false;
    return (
      <div
        key={config.id}
        className={`w-full flex items-center gap-1 rounded-lg text-xs transition-colors duration-300 ease-in-out ${
          isActive
            ? 'bg-[#3347ff] text-white border border-[#3347ff]'
            : 'text-gray-300 border border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleFavorite(config.id)}
          className="flex-shrink-0 p-1.5 md:hover:bg-white/10 rounded-lg transition-colors duration-300 ease-in-out"
          title={favorites.has(config.id) ? t('fav_remove') : t('fav_add')}
        >
          <Star
            className={`w-3.5 h-3.5 transition-colors duration-300 ease-in-out ${
              favorites.has(config.id)
                ? 'fill-yellow-400 text-yellow-400'
                : isActive
                  ? 'text-white/70 md:hover:text-yellow-300'
                  : 'text-gray-400 md:hover:text-yellow-400'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => handleToggleIndicator(config.id)}
          className={`flex-1 min-w-0 text-left py-1.5 pr-1 rounded-r-lg transition-colors duration-300 ease-in-out ${
            isActive ? '' : 'md:hover:bg-white/8 md:hover:text-white'
          }`}
        >
          <span className="block truncate">{getIndicatorLabel(config)}</span>
        </button>
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleDisableIndicator(config.id);
            }}
            className="flex-shrink-0 mr-1 p-1 rounded-md text-white/80 md:hover:bg-white/15 md:hover:text-white transition-colors"
            title={t('ind_menu_turn_off')}
            aria-label={t('ind_menu_turn_off')}
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-300 ease-in-out flex items-center justify-center text-white md:hover:bg-white/10"
        title={t('menu_indicators')}
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <SlidersHorizontal className="w-4 h-4" weight="bold" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-[calc(50%+36px)] md:-translate-x-1/2 mt-2 rounded-lg shadow-xl min-w-[200px] z-50 overflow-hidden bg-[#1e2a40] border border-white/5">
          <div className="p-2">
            {favoriteConfigs.length > 0 && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide rounded-lg mb-1.5">
                  {t('favorites_section')}
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
