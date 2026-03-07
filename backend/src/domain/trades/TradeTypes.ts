/**
 * Domain types for Trades
 */

export enum TradeDirection {
  CALL = 'CALL',
  PUT = 'PUT',
}

export enum TradeStatus {
  OPEN = 'OPEN',
  WIN = 'WIN',
  LOSS = 'LOSS',
  TIE = 'TIE', // Ничья: exitPrice === entryPrice → возврат ставки
}

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  direction: TradeDirection;
  instrument: string; // Trading instrument (e.g., 'EURUSD_OTC', 'AUDCHF_REAL')
  amount: number; // Decimal as number for domain
  entryPrice: number;
  exitPrice: number | null;
  payout: number; // Payout percentage (e.g., 0.8 for 80%)
  status: TradeStatus;
  openedAt: Date;
  expiresAt: Date;
  closedAt: Date | null;
}

export interface OpenTradeInput {
  userId: string;
  accountId: string;
  direction: TradeDirection;
  amount: number;
  expirationSeconds: number; // Must be multiple of 5, min 5, max 300 (5m)
  instrument: string; // Trading instrument (e.g., 'EURUSD_OTC', 'AUDCHF_REAL')
}

export interface TradeDTO {
  id: string;
  accountId: string;
  direction: TradeDirection;
  instrument: string; // Trading instrument
  amount: string; // Decimal as string for API
  entryPrice: string;
  exitPrice: string | null;
  payout: string;
  status: TradeStatus;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
}
