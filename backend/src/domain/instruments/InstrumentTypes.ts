/**
 * FLOW P1 — Instrument Model (Domain)
 *
 * Один терминал — один актив. Snapshot + WS всегда для текущего инструмента.
 */

export interface Instrument {
  id: string; // 'EURUSD_OTC', 'EURUSD_REAL', 'BTCUSD_OTC'
  base: string; // 'EUR', 'BTC', 'AUD'
  quote: string; // 'USD', 'CAD', 'JPY'
  digits: number; // price precision (2 for crypto, 3 for JPY pairs, 5 for others)
  // 🔥 FLOW I-PAYOUT: Доходность инструмента
  payoutPercent?: number; // 60–90%
}
