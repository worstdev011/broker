const DESKTOP_MIN_VISIBLE_CANDLES = 35;

/** Terminal uses a fixed desktop zoom range (no breakpoint-based narrowing). */
export function getMinVisibleCandlesForZoom(): number {
  return DESKTOP_MIN_VISIBLE_CANDLES;
}
