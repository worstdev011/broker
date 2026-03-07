/**
 * WebSocket event types
 */

import type { PriceTick } from '../../prices/PriceTypes.js';
import type { Candle } from '../../prices/PriceTypes.js';
import type { TradeDTO } from '../../domain/trades/TradeTypes.js';

/** FLOW P5: price/candle events include instrument (BTCUSD_OTC, EURUSD_OTC, EURUSD_REAL, …) */
export type WsEvent =
  | { instrument: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument: string; type: 'candle:update'; data: { timeframe: string; candle: Candle } }
  | { instrument: string; type: 'candle:close'; data: { timeframe: string; candle: Candle } }
  // FLOW CANDLE-SNAPSHOT: Активные свечи при подписке на инструмент (восстановление live-свечи)
  | { instrument: string; type: 'candle:snapshot'; data: { candles: Array<{ timeframe: string; candle: Candle }> } }
  | { type: 'trade:open'; data: TradeDTO }
  | { type: 'trade:close'; data: TradeDTO & { result: 'WIN' | 'LOSS' | 'TIE' } }
  | { type: 'trade:countdown'; data: { tradeId: string; secondsLeft: number } }
  | { type: 'server:time'; data: { timestamp: number; rateLimited?: boolean } }
  | { type: 'server:shutdown'; data: { message: string } }
  // FLOW A-ACCOUNT: Account snapshot event
  | { type: 'account.snapshot'; payload: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number } }
  // FLOW WS-1: Handshake events
  | { type: 'ws:ready'; sessionId: string; serverTime: number }
  | { type: 'subscribed'; instrument: string }
  | { type: 'unsubscribed'; instrument: string };

export interface WsClientMessage {
  type: 'ping' | 'subscribe' | 'unsubscribe' | 'unsubscribe_all';
  /**
   * Для subscribe: идентификатор инструмента (EURUSD_OTC, BTCUSD_OTC, EURUSD_REAL, …)
   */
  instrument?: string;
  /**
   * 🔥 FLOW WS-TF: Для subscribe — активный таймфрейм ('5s', '1m', …)
   * Сервер отправляет candle:close и snapshot только для этого таймфрейма
   */
  timeframe?: string;
  data?: unknown;
}
