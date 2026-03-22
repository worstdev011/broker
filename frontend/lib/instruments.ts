/**
 * FLOW P6 - Instrument Registry (Frontend)
 * Один терминал - один актив. activeInstrumentRef + reinit при смене.
 */

export const DEFAULT_INSTRUMENT_ID = 'EURUSD_OTC';

export interface InstrumentInfo {
  id: string;
  label: string;
  digits: number;
}

export const INSTRUMENTS: InstrumentInfo[] = [
  // Real market pairs (отображаются без суффикса - «настоящие» рыночные котировки)
  { id: 'AUDCHF_REAL', label: 'AUD/CHF', digits: 5 },
  { id: 'AUDJPY_REAL', label: 'AUD/JPY', digits: 3 },
  { id: 'EURGBP_REAL', label: 'EUR/GBP', digits: 5 },
  { id: 'EURUSD_REAL', label: 'EUR/USD', digits: 5 },
  { id: 'AUDCAD_REAL', label: 'AUD/CAD', digits: 5 },
  { id: 'EURJPY_REAL', label: 'EUR/JPY', digits: 3 },
  { id: 'EURAUD_REAL', label: 'EUR/AUD', digits: 5 },
  { id: 'GBPCAD_REAL', label: 'GBP/CAD', digits: 5 },
  { id: 'GBPUSD_REAL', label: 'GBP/USD', digits: 5 },
  { id: 'USDCHF_REAL', label: 'USD/CHF', digits: 5 },
  { id: 'GBPJPY_REAL', label: 'GBP/JPY', digits: 3 },
  { id: 'CHFJPY_REAL', label: 'CHF/JPY', digits: 3 },
  { id: 'USDCAD_REAL', label: 'USD/CAD', digits: 5 },
  { id: 'USDJPY_REAL', label: 'USD/JPY', digits: 3 },
  { id: 'GBPCHF_REAL', label: 'GBP/CHF', digits: 5 },
  { id: 'EURCAD_REAL', label: 'EUR/CAD', digits: 5 },
  { id: 'CADJPY_REAL', label: 'CAD/JPY', digits: 3 },
  { id: 'CADCHF_REAL', label: 'CAD/CHF', digits: 5 },

  // OTC pairs
  { id: 'EURUSD_OTC', label: 'EUR/USD OTC', digits: 5 },
  { id: 'GBPUSD_OTC', label: 'GBP/USD OTC', digits: 5 },
  { id: 'USDCAD_OTC', label: 'USD/CAD OTC', digits: 5 },
  { id: 'USDCHF_OTC', label: 'USD/CHF OTC', digits: 5 },
  { id: 'AUDCAD_OTC', label: 'AUD/CAD OTC', digits: 5 },
  { id: 'AUDCHF_OTC', label: 'AUD/CHF OTC', digits: 5 },
  { id: 'CADJPY_OTC', label: 'CAD/JPY OTC', digits: 3 },
  { id: 'EURJPY_OTC', label: 'EUR/JPY OTC', digits: 3 },
  { id: 'GBPJPY_OTC', label: 'GBP/JPY OTC', digits: 3 },
  { id: 'NZDUSD_OTC', label: 'NZD/USD OTC', digits: 5 },
  { id: 'NZDJPY_OTC', label: 'NZD/JPY OTC', digits: 3 },
  { id: 'EURCHF_OTC', label: 'EUR/CHF OTC', digits: 5 },
  { id: 'EURNZD_OTC', label: 'EUR/NZD OTC', digits: 5 },
  { id: 'GBPAUD_OTC', label: 'GBP/AUD OTC', digits: 5 },
  { id: 'CHFNOK_OTC', label: 'CHF/NOK OTC', digits: 4 },
  { id: 'UAHUSD_OTC', label: 'UAH/USD OTC', digits: 5 },
  { id: 'BTCUSD_OTC', label: 'BTC/USD OTC', digits: 2 },
  { id: 'ETHUSD_OTC', label: 'ETH/USD OTC', digits: 2 },
  { id: 'SOLUSD_OTC', label: 'SOL/USD OTC', digits: 2 },
  { id: 'BNBUSD_OTC', label: 'BNB/USD OTC', digits: 2 },
];

export function getInstrument(id: string): InstrumentInfo | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}

export function getInstrumentOrDefault(id: string | undefined): InstrumentInfo {
  const key = id || DEFAULT_INSTRUMENT_ID;
  return getInstrument(key) ?? INSTRUMENTS[0];
}
