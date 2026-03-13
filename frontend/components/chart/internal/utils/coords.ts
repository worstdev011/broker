/** Minimal viewport shape used by coordinate helpers. */
export interface ViewportLike {
  timeStart: number;
  timeEnd: number;
  priceMin: number;
  priceMax: number;
}

export function timeToX(time: number, viewport: ViewportLike, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

export function priceToY(price: number, viewport: ViewportLike, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

/** Sub-pixel aligned coordinate for crisp 1px lines. */
export function snap(v: number): number {
  return Math.round(v) + 0.5;
}
