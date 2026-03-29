/**
 * Localized strings for canvas-rendered chart UI (OHLC box, market closed overlay, alternatives).
 * Built in useChart from next-intl and passed into the render loop.
 */
export interface ChartCanvasCopy {
  ohlcOpen: string;
  ohlcHigh: string;
  ohlcLow: string;
  ohlcClose: string;
  marketClosedTitle: string;
  marketResumeIn: string;
  marketWeekendIdle: string;
  marketHolidayIdle: string;
  marketMaintenanceIdle: string;
  formatCountdownDHM: (days: number, hours: number, minutes: number) => string;
  formatCountdownHMS: (hours: number, minutes: number, seconds: number) => string;
  alternativesHeader: string;
}
