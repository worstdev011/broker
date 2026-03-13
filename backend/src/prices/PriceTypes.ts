/**
 * Price engine types
 */

export interface PriceTick {
  price: number;
  timestamp: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number; // Start timestamp of the candle
  timeframe: string; // '5s'
}

export type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface PriceConfig {
  asset: string;
  initialPrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number; // 0-1, controls price movement
  tickInterval: number; // milliseconds (400-600ms)
}

export interface CandleConfig {
  baseTimeframe: Timeframe; // '5s'
  aggregationTimeframes: Timeframe[]; // [] - только базовый таймфрейм 5s
}

export type PriceEventType = 'price_tick' | 'candle_opened' | 'candle_updated' | 'candle_closed';

export interface PriceEvent {
  type: PriceEventType;
  data: PriceTick | Candle;
  timestamp: number;
}

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
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
  '30m': 1_800,
  '1h': 3_600,
  '4h': 14_400,
  '1d': 86_400,
};

export function getTimeframeMs(timeframe: Timeframe): number {
  return TIMEFRAME_SECONDS[timeframe] * 1_000;
}

export function getTimeframeSeconds(timeframe: Timeframe): number {
  return TIMEFRAME_SECONDS[timeframe];
}
