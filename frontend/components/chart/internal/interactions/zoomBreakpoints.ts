/**
 * Лимиты zoom только для узкого экрана (телефон, max-width 767px, как Tailwind md).
 * На десктопе значения как раньше - поведение ПК не меняется.
 */
const DESKTOP_MIN_VISIBLE_CANDLES = 35;
const NARROW_MIN_VISIBLE_CANDLES = 18;

export function getMinVisibleCandlesForZoom(): number {
  if (typeof window === 'undefined') return DESKTOP_MIN_VISIBLE_CANDLES;
  return window.matchMedia('(max-width: 767px)').matches
    ? NARROW_MIN_VISIBLE_CANDLES
    : DESKTOP_MIN_VISIBLE_CANDLES;
}
