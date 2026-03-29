import type { TradeClosePayload } from '@/lib/hooks/useWebSocket';

/**
 * Чистый P&L закрытой сделки в валюте счёта.
 * В payload `payout` — процент прибыли инструмента (например 75 при 75%),
 * итоговый P&L = amount * payout / 100.
 */
export function netPnlFromTradeClose(
  payload: Pick<TradeClosePayload, 'result' | 'amount' | 'payout'>,
): number {
  const amount = parseFloat(payload.amount);
  const mult = parseFloat(payload.payout);
  if (!Number.isFinite(amount)) return 0;
  if (payload.result === 'WIN') {
    return Number.isFinite(mult) ? amount * mult / 100 : 0;
  }
  if (payload.result === 'LOSS') {
    return -Math.abs(amount);
  }
  return 0;
}
