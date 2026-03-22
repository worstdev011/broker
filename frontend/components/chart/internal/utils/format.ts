import { getChartSettings } from '@/lib/chartSettings';

/**
 * Formats a price value. Uses instrument `digits` when available,
 * otherwise falls back to magnitude-based decimal count.
 */
export function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '-';
  if (digits != null) return price.toFixed(digits);
  const decimals = price >= 1000 ? 0 : price >= 100 ? 1 : price >= 10 ? 2 : 3;
  return price.toFixed(decimals);
}

/** Formats a timestamp as HH:mm:ss, applying the user's chart timezone offset. */
export function formatTime(timestamp: number): string {
  const settings = getChartSettings();
  const adjustedTs = timestamp + settings.timezoneOffset * 60 * 60 * 1000;
  const date = new Date(adjustedTs);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

const MIN_LABEL_SPACING = 60;

/** Calculates the optimal time step for grid/axis labels. */
export function calculateTimeLabelStep(timeRange: number, width: number): number {
  const targetLabels = Math.floor(width / MIN_LABEL_SPACING);
  if (targetLabels <= 0) return timeRange;

  const timePerLabel = timeRange / targetLabels;

  if (timePerLabel < 1000) {
    return Math.ceil(timePerLabel / 1000) * 1000;
  } else if (timePerLabel < 60000) {
    const seconds = Math.ceil(timePerLabel / 1000);
    if (seconds <= 5) return 5000;
    if (seconds <= 10) return 10000;
    if (seconds <= 30) return 30000;
    return 60000;
  } else {
    const minutes = Math.ceil(timePerLabel / 60000);
    return minutes * 60000;
  }
}

/** Calculates the optimal price step for grid/axis labels. */
export function calculatePriceStep(priceRange: number, height: number): number {
  if (height <= 0 || priceRange <= 0) return priceRange || 1;

  const targetSteps = 10;
  const pixelsPerStep = height / targetSteps;
  const pricePerPixel = priceRange / height;
  const priceStep = pixelsPerStep * pricePerPixel;

  if (!Number.isFinite(priceStep) || priceStep <= 0) return priceRange || 1;

  const magnitude = Math.pow(10, Math.floor(Math.log10(priceStep)));
  if (!Number.isFinite(magnitude) || magnitude <= 0) return priceRange || 1;

  const normalized = priceStep / magnitude;

  let step: number;
  if (normalized <= 1) step = 1;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 5) step = 5;
  else step = 10;

  return step * magnitude;
}
