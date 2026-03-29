export const MIN_TRADE_AMOUNT = 1;
export const MAX_TRADE_AMOUNT = 50_000;
export const MIN_EXPIRATION_SECONDS = 5;
export const MAX_EXPIRATION_SECONDS = 3600;
export const EXPIRATION_STEP_SECONDS = 5;
/** Типовые пресеты UI (секунды); API принимает любое кратное EXPIRATION_STEP_SECONDS в [MIN, MAX] */
export const EXPIRATION_PRESET_SECONDS = [
  5, 15, 30, 60, 180, 300, 900, 1800, 3600,
] as const;
export const MAX_ACTIVE_TRADES = 20;
export const IDEMPOTENCY_KEY_PREFIX = "idempotency:";
export const IDEMPOTENCY_KEY_TTL = 600;
export const ACTIVE_TRADES_PREFIX = "active_trades:";
export const PRICE_EPSILON = 0.000001;
export const TRADE_CLOSING_QUEUE = "trade-closing";
export const TRADE_CLOSING_MAX_RETRIES = 3;
export const TRADE_CLOSING_BACKOFF_MS = 1000;
