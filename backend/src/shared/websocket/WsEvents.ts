import type { PriceTick } from '../../prices/PriceTypes.js';
import type { Candle } from '../../prices/PriceTypes.js';
import type { TradeDTO } from '../../domain/trades/TradeTypes.js';
import type { MarketStatus, MarketAlternative } from '../../domain/terminal/MarketStatus.js';

export interface ChartInitCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
}

export interface ChartInitData {
  instrument: string;
  timeframe: string;
  candles: ChartInitCandle[];
  activeCandle: ChartInitCandle | null;
  price: { value: number; timestamp: number } | null;
  serverTime: number;
  marketOpen: boolean;
  marketStatus: MarketStatus;
  nextMarketOpenAt: string | null;
  topAlternatives: MarketAlternative[];
}

export type WsEvent =
  | { instrument: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument: string; type: 'candle:update'; data: { timeframe: string; candle: Candle } }
  | { instrument: string; type: 'candle:close'; data: { timeframe: string; candle: Candle } }
  | { instrument: string; type: 'candle:snapshot'; data: { candles: Array<{ timeframe: string; candle: Candle }> } }
  | { instrument: string; type: 'chart:init'; data: ChartInitData }
  | { type: 'trade:open'; data: TradeDTO }
  | { type: 'trade:close'; data: TradeDTO & { result: 'WIN' | 'LOSS' | 'TIE' } }
  | { type: 'trade:countdown'; data: { tradeId: string; secondsLeft: number } }
  | { type: 'server:time'; data: { timestamp: number; rateLimited?: boolean } }
  | { type: 'server:shutdown'; data: { message: string } }
  | { type: 'account.snapshot'; data: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number } }
  | { type: 'error'; message: string }
  | { type: 'ws:ready'; sessionId: string; serverTime: number }
  | { type: 'subscribed'; instrument: string }
  | { type: 'unsubscribed'; instrument: string };

export interface WsClientMessage {
  type: 'ping' | 'subscribe' | 'unsubscribe' | 'unsubscribe_all';
  instrument?: string;
  /** Active timeframe for filtering candle:close and snapshot ('5s', '1m', etc.) */
  timeframe?: string;
  data?: unknown;
}
