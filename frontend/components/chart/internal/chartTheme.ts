/**
 * Shared visual constants for all chart UI elements.
 * Single source of truth — axes, crosshair, price line, grid, countdown.
 */

// Layout
export const PRICE_AXIS_WIDTH = 60;
export const TIME_AXIS_HEIGHT = 25;

// Colors
export const BG_COLOR = '#061230';
export const TIME_AXIS_BG = '#05122a';
export const GRID_COLOR = 'rgba(255, 255, 255, 0.07)';
export const LABEL_COLOR = 'rgba(255, 255, 255, 0.45)';
export const AXIS_LINE_COLOR = 'rgba(255, 255, 255, 0.3)';
export const CROSSHAIR_LINE_COLOR = 'rgba(64, 100, 143, 0.5)';
export const CROSSHAIR_LABEL_BG = '#40648f';
export const PRICE_LINE_COLOR = 'rgba(64, 100, 143, 0.5)';
export const PRICE_LABEL_UP = '#26a69a';
export const PRICE_LABEL_DOWN = '#ef5350';
export const PRICE_LABEL_NEUTRAL = '#40648f';

// Typography
export const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const LABEL_FONT = `11px ${FONT_FAMILY}`;
export const PRICE_LABEL_FONT = `600 12px ${FONT_FAMILY}`;
export const SMALL_LABEL_FONT = `10px ${FONT_FAMILY}`;

// Sizes
export const LABEL_BORDER_RADIUS = 6;
export const PRICE_LABEL_HEIGHT = 26;
export const LABEL_PADDING = 6;
export const TIME_LABEL_PADDING = 8;

// Price line
export const PRICE_LINE_DASH: number[] = [6, 4];
export const PRICE_LINE_WIDTH = 1;
export const GRID_LINE_WIDTH = 1;
