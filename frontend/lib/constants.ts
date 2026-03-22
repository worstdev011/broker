/**
 * Frontend constants - централизованные значения вместо magic numbers
 */

import urlConfig from './urls.js';

/** Fallback backend URL when env vars are not set */
export const FALLBACK_BACKEND_URL = urlConfig.FALLBACK_BACKEND_URL;

/** Fallback support channel URL when env var is not set */
export const FALLBACK_SUPPORT_CHANNEL_URL = urlConfig.FALLBACK_SUPPORT_CHANNEL_URL;

/** API version prefix - все запросы идут на /api/v1/... */
export const API_PREFIX = '/api/v1';

/** Максимальное количество свечей/точек в памяти (производительность) */
export const MAX_CANDLES = 3000;

/** Базовый таймфрейм 5s в миллисекундах */
export const BASE_TIMEFRAME_MS = 5000;

/** За сколько мс до границы viewport начинать подгрузку истории */
export const PRELOAD_THRESHOLD_MS = 5000;

/** Количество свечей за один запрос истории */
export const HISTORY_LIMIT = 200;

/** WebSocket: задержка перед переподключением (мс) */
export const WS_RECONNECT_DELAY_MS = 3000;

/** WebSocket: максимум попыток переподключения */
export const WS_MAX_RECONNECT_ATTEMPTS = 5;

/** WebSocket: интервал ping для поддержания соединения (мс) */
export const WS_PING_INTERVAL_MS = 30000;

/** Дефолтный payout % при отсутствии данных с сервера */
export const DEFAULT_PAYOUT_PERCENT = 75;

/** Длительность показа toast успеха (мс) */
export const SUCCESS_TOAST_DURATION_MS = 3000;

/** Таймаут HTTP запросов (мс) */
export const REQUEST_TIMEOUT_MS = 15000;

/** Таймфреймы для линейного графика (label → секунды) */
export const LINE_CHART_TIMEFRAME_SECONDS: Record<string, number> = {
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
} as const;

/** Пресеты длительности сделки (секунды) */
export const TRADE_DURATION_PRESETS = [
  { label: 'S3', seconds: 3 },
  { label: 'S15', seconds: 15 },
  { label: 'S30', seconds: 30 },
  { label: 'M1', seconds: 60 },
  { label: 'M3', seconds: 180 },
  { label: 'M5', seconds: 300 },
  { label: 'M30', seconds: 1800 },
  { label: 'H1', seconds: 3600 },
  { label: 'H4', seconds: 14400 },
] as const;
