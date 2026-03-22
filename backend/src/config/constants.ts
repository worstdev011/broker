import type { Timeframe } from '../prices/PriceTypes.js';

// ─── Payout ──────────────────────────────────────────────────────────────────

/** Default payout % when instrument has no DB override */
export const DEFAULT_PAYOUT_PERCENT = 75;

/** Allowed payout % range for admin validation */
export const PAYOUT_MIN = 60;
export const PAYOUT_MAX = 90;

// ─── Timeframes ──────────────────────────────────────────────────────────────

export const BASE_TIMEFRAME_MS = 5_000;

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '2m': 120,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

export function timeframeToMs(timeframe: Timeframe): number {
  const seconds = TIMEFRAME_SECONDS[timeframe] ?? 5;
  return seconds * 1000;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const DEMO_INITIAL_BALANCE = 10_000;
export const DEMO_RESET_LIMIT = 1_000;
export const DEMO_DEFAULT_CURRENCY = 'USD';
export const REAL_DEFAULT_CURRENCY = 'UAH';

// ─── Finance (Deposit / Withdraw) ────────────────────────────────────────────

export const DEPOSIT_MIN_AMOUNT = 300;
export const DEPOSIT_MAX_AMOUNT = 29_999;
export const WITHDRAW_MIN_AMOUNT = 300;
export const WITHDRAW_MAX_AMOUNT = 29_999;
export const DEFAULT_FIAT_CURRENCY = 'UAH';

// ─── Session ──────────────────────────────────────────────────────────────────

export const SESSION_TTL_DAYS = 30;

export const TRADE_MIN_EXPIRATION_SECONDS = 5;
export const TRADE_MAX_EXPIRATION_SECONDS = 300;
export const TRADE_EXPIRATION_STEP = 5;
export const TRADE_MAX_AMOUNT = 50_000;
export const TRADE_CLOSING_INTERVAL_MS = 1_000;
export const TRADE_STALE_THRESHOLD_MS = 60_000;

// ─── File uploads ────────────────────────────────────────────────────────────

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

// ─── Rate limits ─────────────────────────────────────────────────────────────

export const RATE_LIMIT_MAX = 100;
export const RATE_LIMIT_CACHE = 10_000;

export const RATE_LIMIT_UPLOAD_MAX = 10;
export const RATE_LIMIT_UPLOAD_WINDOW = '1 hour';

export const RATE_LIMIT_AUTH_LOGIN_MAX = 5;
export const RATE_LIMIT_AUTH_LOGIN_WINDOW = '15 minutes';
export const RATE_LIMIT_AUTH_REGISTER_MAX = 3;
export const RATE_LIMIT_AUTH_REGISTER_WINDOW = '1 hour';
export const RATE_LIMIT_AUTH_2FA_MAX = 5;
export const RATE_LIMIT_AUTH_2FA_WINDOW = '5 minutes';

// ─── Line chart ──────────────────────────────────────────────────────────────

export const LINE_CHART_SNAPSHOT_TAKE = 600;
export const LINE_CHART_HISTORY_LIMIT = 300;

// ─── WebSocket ───────────────────────────────────────────────────────────────

export const WS_HEARTBEAT_INTERVAL_MS = 30_000;
export const WS_RATE_LIMIT_MAX = 100;
export const WS_RATE_LIMIT_WINDOW_MS = 1_000;

export const WS_HUB_BASE_RECONNECT_DELAY_MS = 2_000;
export const WS_HUB_MAX_RECONNECT_DELAY_MS = 60_000;
