export interface TradeHistoryItem {
  id: string;
  direction: 'CALL' | 'PUT';
  instrument: string;
  amount: string;
  status: 'OPEN' | 'WIN' | 'LOSS' | 'TIE';
  openedAt: string;
  closedAt: string | null;
  expiresAt: string;
  payout: string;
  entryPrice: string;
  exitPrice: string | null;
}
