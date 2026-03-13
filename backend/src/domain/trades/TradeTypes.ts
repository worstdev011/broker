export enum TradeDirection {
  CALL = 'CALL',
  PUT = 'PUT',
}

export enum TradeStatus {
  OPEN = 'OPEN',
  WIN = 'WIN',
  LOSS = 'LOSS',
  TIE = 'TIE',
}

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  direction: TradeDirection;
  instrument: string;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  payout: number;
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
  expirationSeconds: number;
  instrument: string;
}

export interface TradeDTO {
  id: string;
  accountId: string;
  direction: TradeDirection;
  instrument: string;
  amount: string;
  entryPrice: string;
  exitPrice: string | null;
  payout: string;
  status: TradeStatus;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
}
