import type { TradeClosePayload } from '@/lib/hooks/useWebSocket';

/**
 * Чистый P&L закрытой сделки в валюте счёта.
 * В payload `payout` — процент прибыли инструмента (например 75 при 75%),
 * итоговый P&L = amount * payout / 100.
 */
export function netPnlFromTradeClose(
  payload: Pick<TradeClosePayload, 'result' | 'amount' | 'payout' | 'pnl' | 'status'>,
): number {
  if (payload.pnl != null && Number.isFinite(payload.pnl)) {
    return payload.pnl;
  }
  const amount = parseFloat(payload.amount);
  const mult = parseFloat(payload.payout);
  if (!Number.isFinite(amount)) return 0;
  const result =
    payload.result ??
    (payload.status === 'WIN' || payload.status === 'LOSS' || payload.status === 'TIE'
      ? payload.status
      : undefined);
  if (result === 'WIN') {
    return Number.isFinite(mult) ? amount * mult / 100 : 0;
  }
  if (result === 'LOSS') {
    return -Math.abs(amount);
  }
  return 0;
}
