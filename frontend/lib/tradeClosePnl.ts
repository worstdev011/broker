import type { TradeClosePayload } from '@/lib/hooks/useWebSocket';

/**
 * Чистый P&L закрытой сделки в валюте счёта.
 * В payload `payout` — множитель прибыли инструмента (например 0.75 при 75%), не сумма выплаты.
 */
export function netPnlFromTradeClose(
  payload: Pick<TradeClosePayload, 'result' | 'amount' | 'payout'>,
): number {
  const amount = parseFloat(payload.amount);
  const mult = parseFloat(payload.payout);
  if (!Number.isFinite(amount)) return 0;
  if (payload.result === 'WIN') {
    return Number.isFinite(mult) ? amount * mult : 0;
  }
  if (payload.result === 'LOSS') {
    return -Math.abs(amount);
  }
  return 0;
}
