import type { Instrument } from '../domain/instruments/InstrumentTypes.js';
import type { PriceConfig } from '../prices/PriceTypes.js';
import type { PriceSource } from '../prices/types/PriceSource.js';

export interface InstrumentConfig extends Instrument {
  source: PriceSource;
  /** OTC price generator params (only for source='otc') */
  engine?: Omit<PriceConfig, 'asset'> & { asset: string };
  /** External price source config (only for source='real') */
  real?: {
    provider: 'xchange';
    symbol: string;
    pair: string;
  };
}

function forex(
  id: string,
  base: string,
  quote: string,
  digits: number,
  initialPrice: number,
  minPrice: number,
  maxPrice: number,
): InstrumentConfig {
  return {
    id,
    base,
    quote,
    digits,
    source: 'otc',
    engine: {
      asset: `${base}/${quote}`,
      initialPrice,
      minPrice,
      maxPrice,
      volatility: 0.0002,
      tickInterval: 500,
    },
  };
}

function realForex(id: string, base: string, quote: string, digits: number): InstrumentConfig {
  return {
    id,
    base,
    quote,
    digits,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: `${base}/${quote}`,
      pair: `${base}${quote}`,
    },
  };
}

export const INSTRUMENTS: Record<string, InstrumentConfig> = {
  // OTC pairs
  EURUSD_OTC: forex('EURUSD_OTC', 'EUR', 'USD', 5, 1.08, 0.95, 1.25),
  GBPUSD_OTC: forex('GBPUSD_OTC', 'GBP', 'USD', 5, 1.27, 1.0, 1.5),
  USDCAD_OTC: forex('USDCAD_OTC', 'USD', 'CAD', 5, 1.36, 1.2, 1.5),
  USDCHF_OTC: forex('USDCHF_OTC', 'USD', 'CHF', 5, 0.88, 0.8, 1.0),
  AUDCAD_OTC: forex('AUDCAD_OTC', 'AUD', 'CAD', 5, 0.88, 0.8, 1.0),
  AUDCHF_OTC: forex('AUDCHF_OTC', 'AUD', 'CHF', 5, 0.57, 0.5, 0.65),
  CADJPY_OTC: forex('CADJPY_OTC', 'CAD', 'JPY', 3, 110, 95, 125),
  EURJPY_OTC: forex('EURJPY_OTC', 'EUR', 'JPY', 3, 165, 140, 175),
  GBPJPY_OTC: forex('GBPJPY_OTC', 'GBP', 'JPY', 3, 200, 165, 220),
  NZDUSD_OTC: forex('NZDUSD_OTC', 'NZD', 'USD', 5, 0.61, 0.52, 0.72),
  NZDJPY_OTC: forex('NZDJPY_OTC', 'NZD', 'JPY', 3, 97, 82, 110),
  EURCHF_OTC: forex('EURCHF_OTC', 'EUR', 'CHF', 5, 0.95, 0.88, 1.02),
  EURNZD_OTC: forex('EURNZD_OTC', 'EUR', 'NZD', 5, 1.75, 1.55, 1.95),
  GBPAUD_OTC: forex('GBPAUD_OTC', 'GBP', 'AUD', 5, 1.95, 1.7, 2.2),
  CHFNOK_OTC: forex('CHFNOK_OTC', 'CHF', 'NOK', 4, 12.0, 10.5, 13.5),
  UAHUSD_OTC: forex('UAHUSD_OTC', 'UAH', 'USD', 5, 0.025, 0.02, 0.03),
  BTCUSD_OTC: {
    id: 'BTCUSD_OTC',
    base: 'BTC',
    quote: 'USD',
    digits: 2,
    source: 'otc',
    engine: {
      asset: 'BTC/USD',
      initialPrice: 50_000,
      minPrice: 30_000,
      maxPrice: 70_000,
      volatility: 0.001,
      tickInterval: 500,
    },
  },
  ETHUSD_OTC: {
    id: 'ETHUSD_OTC',
    base: 'ETH',
    quote: 'USD',
    digits: 2,
    source: 'otc',
    engine: {
      asset: 'ETH/USD',
      initialPrice: 3_000,
      minPrice: 2_000,
      maxPrice: 4_500,
      volatility: 0.001,
      tickInterval: 500,
    },
  },
  SOLUSD_OTC: {
    id: 'SOLUSD_OTC',
    base: 'SOL',
    quote: 'USD',
    digits: 2,
    source: 'otc',
    engine: {
      asset: 'SOL/USD',
      initialPrice: 150,
      minPrice: 80,
      maxPrice: 250,
      volatility: 0.0015,
      tickInterval: 500,
    },
  },
  BNBUSD_OTC: {
    id: 'BNBUSD_OTC',
    base: 'BNB',
    quote: 'USD',
    digits: 2,
    source: 'otc',
    engine: {
      asset: 'BNB/USD',
      initialPrice: 600,
      minPrice: 400,
      maxPrice: 800,
      volatility: 0.001,
      tickInterval: 500,
    },
  },

  // Real market prices
  AUDCHF_REAL: realForex('AUDCHF_REAL', 'AUD', 'CHF', 5),
  AUDJPY_REAL: realForex('AUDJPY_REAL', 'AUD', 'JPY', 3),
  EURGBP_REAL: realForex('EURGBP_REAL', 'EUR', 'GBP', 5),
  EURUSD_REAL: realForex('EURUSD_REAL', 'EUR', 'USD', 5),
  AUDCAD_REAL: realForex('AUDCAD_REAL', 'AUD', 'CAD', 5),
  EURJPY_REAL: realForex('EURJPY_REAL', 'EUR', 'JPY', 3),
  EURAUD_REAL: realForex('EURAUD_REAL', 'EUR', 'AUD', 5),
  GBPCAD_REAL: realForex('GBPCAD_REAL', 'GBP', 'CAD', 5),
  GBPUSD_REAL: realForex('GBPUSD_REAL', 'GBP', 'USD', 5),
  USDCHF_REAL: realForex('USDCHF_REAL', 'USD', 'CHF', 5),
  GBPJPY_REAL: realForex('GBPJPY_REAL', 'GBP', 'JPY', 3),
  CHFJPY_REAL: realForex('CHFJPY_REAL', 'CHF', 'JPY', 3),
  USDCAD_REAL: realForex('USDCAD_REAL', 'USD', 'CAD', 5),
  USDJPY_REAL: realForex('USDJPY_REAL', 'USD', 'JPY', 3),
  GBPCHF_REAL: realForex('GBPCHF_REAL', 'GBP', 'CHF', 5),
  EURCAD_REAL: realForex('EURCAD_REAL', 'EUR', 'CAD', 5),
  CADJPY_REAL: realForex('CADJPY_REAL', 'CAD', 'JPY', 3),
  CADCHF_REAL: realForex('CADCHF_REAL', 'CAD', 'CHF', 5),
};

export const DEFAULT_INSTRUMENT_ID = 'EURUSD_OTC';

export function getInstrumentIds(): string[] {
  return Object.keys(INSTRUMENTS);
}

export function getInstrument(id: string): InstrumentConfig | undefined {
  return INSTRUMENTS[id];
}

export function getInstrumentOrDefault(id: string | undefined): InstrumentConfig {
  const key = id ?? DEFAULT_INSTRUMENT_ID;
  return INSTRUMENTS[key] ?? INSTRUMENTS[DEFAULT_INSTRUMENT_ID]!;
}

/** Resolve instrumentId from symbol "EUR/USD" or id "EURUSD_OTC" */
export function getInstrumentIdBySymbol(symbolOrId: string): string {
  if (!symbolOrId) return DEFAULT_INSTRUMENT_ID;

  const found = Object.entries(INSTRUMENTS).find(([, config]) => {
    if (config.id === symbolOrId) return true;
    if (config.source === 'otc' && config.engine?.asset === symbolOrId) return true;
    if (config.source === 'real' && config.real?.symbol === symbolOrId) return true;
    if (config.source === 'real' && config.real?.pair === symbolOrId) return true;
    return false;
  });

  return found ? found[0] : symbolOrId.replace(/\//g, '') || DEFAULT_INSTRUMENT_ID;
}
