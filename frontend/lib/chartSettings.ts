/**
 * Chart Settings - настройки графика
 * Сохраняются в localStorage и применяются ко всем компонентам графика
 */

import { logger } from '@/lib/logger';

export interface ChartSettings {
  // Цвета свечей
  bullishColor: string; // Цвет бычьей свечи (растущей)
  bearishColor: string; // Цвет медвежьей свечи (падающей)
  
  // Фоновое изображение
  backgroundImage: string | null; // URL изображения или null
  backgroundOpacity: number; // Прозрачность фона (0-1)
  
  // Метка лайв свечи
  showCountdown: boolean; // Показывать ли метку с таймфреймом и отсчетом
  
  // Сетка
  showGrid: boolean; // Показывать ли сетку на фоне
  
  // Watermark (название инструмента + таймфрейм по центру графика)
  showWatermark: boolean; // Показывать ли полупрозрачное название пары на фоне
  
  // Часовой пояс
  timezoneOffset: number; // Смещение от UTC в часах (по умолчанию +2)
}

const DEFAULT_SETTINGS: ChartSettings = {
  bullishColor: '#45b833',
  bearishColor: '#ff3d1f',
  backgroundImage: null,
  backgroundOpacity: 0.3,
  showCountdown: true,
  showGrid: true,
  showWatermark: true,
  timezoneOffset: 2, // UTC+2 по умолчанию
};

const STORAGE_KEY = 'chart.settings.v1';

/**
 * Загружает настройки из localStorage
 */
export function loadChartSettings(): ChartSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ChartSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    logger.error('Failed to load chart settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Сохраняет настройки в localStorage
 */
export function saveChartSettings(settings: ChartSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    _cachedSettings = { ...settings };
    _cacheTime = Date.now();
  } catch (error) {
    logger.error('Failed to save chart settings:', error);
  }
}

let _cachedSettings: ChartSettings | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 500;

/**
 * Получает текущие настройки (кэш 500ms — один localStorage read на ~30 кадров)
 */
export function getChartSettings(): ChartSettings {
  const now = Date.now();
  if (_cachedSettings && now - _cacheTime < CACHE_TTL_MS) {
    return _cachedSettings;
  }
  _cachedSettings = loadChartSettings();
  _cacheTime = now;
  return _cachedSettings;
}

/** Force-invalidate settings cache (call after saveChartSettings) */
export function invalidateChartSettingsCache(): void {
  _cachedSettings = null;
  _cacheTime = 0;
}
