export interface TradeHistoryItem {
  id: string;
  direction: 'CALL' | 'PUT';
  instrument: string;
  amount: string;
  status: 'OPEN' | 'WIN' | 'LOSS' | 'TIE';
  openedAt: string;
  closedAt: string | null;
  expiresAt: string;
  /** Процент выплаты; API отдаёт `payoutPercent`, legacy — строка `payout` */
  payout?: string;
  payoutPercent?: number;
  entryPrice: string;
  exitPrice: string | null;
}
