/**
 * FLOW P1 — Instrument config
 *
 * id = instrument key (EURUSD_OTC, GBPUSD_REAL, …).
 * digits = precision for price display.
 * Engine params = initialPrice, bounds, volatility, tickInterval for OTC engine.
 * 
 * FLOW R2: Поддержка real-источника котировок
 */

import type { Instrument } from '../domain/instruments/InstrumentTypes.js';
import type { PriceConfig } from '../prices/PriceTypes.js';
import type { PriceSource } from '../prices/types/PriceSource.js';

export interface InstrumentConfig extends Instrument {
  /** Источник котировок: 'otc' (генерируются) или 'real' (внешний источник) */
  source: PriceSource;
  
  /** Engine params for OTC price generator (только для source='otc') */
  engine?: Omit<PriceConfig, 'asset'> & { asset: string };
  
  /** Конфигурация для real-источника (только для source='real') */
  real?: {
    provider: 'xchange';
    symbol: string; // 'EUR/USD' - унифицированный торговый символ (для внутренней логики)
    pair: string; // 'EURUSD' - для внешнего API (xchangeapi)
  };
}

const forex = (
  id: string,
  base: string,
  quote: string,
  digits: number,
  initialPrice: number,
  minPrice: number,
  maxPrice: number,
): InstrumentConfig => ({
  id,
  base,
  quote,
  digits,
  source: 'otc', // FLOW R2: Явно указываем источник
  engine: {
    asset: `${base}/${quote}`, // symbol для OTC
    initialPrice,
    minPrice,
    maxPrice,
    volatility: 0.0002,
    tickInterval: 500,
  },
});

/**
 * Хелпер для создания унифицированного symbol из base и quote
 * Всегда формат: BASE/QUOTE (например, EUR/USD, GBP/JPY)
 */
function getSymbol(base: string, quote: string): string {
  return `${base}/${quote}`;
}

/**
 * Хелпер для создания pair для внешнего API из base и quote
 * Всегда формат: BASEQUOTE (например, EURUSD, GBPJPY)
 */
function getPair(base: string, quote: string): string {
  return `${base}${quote}`;
}

export const INSTRUMENTS: Record<string, InstrumentConfig> = {
  // OTC pairs (суффикс _OTC)
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
      initialPrice: 50000,
      minPrice: 30000,
      maxPrice: 70000,
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
      initialPrice: 3000,
      minPrice: 2000,
      maxPrice: 4500,
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

  // FLOW R-MULTI: Real market prices для всех валютных пар
  // Унифицированный symbol (EUR/USD) для внутренней логики, pair (EURUSD) для внешнего API
  AUDCHF_REAL: {
    id: 'AUDCHF_REAL',
    base: 'AUD',
    quote: 'CHF',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('AUD', 'CHF'), // 'AUD/CHF' - унифицированный для внутренней логики
      pair: getPair('AUD', 'CHF'), // 'AUDCHF' - для внешнего API
    },
  },
  AUDJPY_REAL: {
    id: 'AUDJPY_REAL',
    base: 'AUD',
    quote: 'JPY',
    digits: 3,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('AUD', 'JPY'), // 'AUD/JPY'
      pair: getPair('AUD', 'JPY'), // 'AUDJPY'
    },
  },
  EURGBP_REAL: {
    id: 'EURGBP_REAL',
    base: 'EUR',
    quote: 'GBP',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('EUR', 'GBP'), // 'EUR/GBP'
      pair: getPair('EUR', 'GBP'), // 'EURGBP'
    },
  },
  EURUSD_REAL: {
    id: 'EURUSD_REAL',
    base: 'EUR',
    quote: 'USD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('EUR', 'USD'), // 'EUR/USD'
      pair: getPair('EUR', 'USD'), // 'EURUSD'
    },
  },
  AUDCAD_REAL: {
    id: 'AUDCAD_REAL',
    base: 'AUD',
    quote: 'CAD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('AUD', 'CAD'), // 'AUD/CAD'
      pair: getPair('AUD', 'CAD'), // 'AUDCAD'
    },
  },
  EURJPY_REAL: {
    id: 'EURJPY_REAL',
    base: 'EUR',
    quote: 'JPY',
    digits: 3,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('EUR', 'JPY'), // 'EUR/JPY'
      pair: getPair('EUR', 'JPY'), // 'EURJPY'
    },
  },
  EURAUD_REAL: {
    id: 'EURAUD_REAL',
    base: 'EUR',
    quote: 'AUD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('EUR', 'AUD'), // 'EUR/AUD'
      pair: getPair('EUR', 'AUD'), // 'EURAUD'
    },
  },
  GBPCAD_REAL: {
    id: 'GBPCAD_REAL',
    base: 'GBP',
    quote: 'CAD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('GBP', 'CAD'), // 'GBP/CAD'
      pair: getPair('GBP', 'CAD'), // 'GBPCAD'
    },
  },
  GBPUSD_REAL: {
    id: 'GBPUSD_REAL',
    base: 'GBP',
    quote: 'USD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('GBP', 'USD'), // 'GBP/USD'
      pair: getPair('GBP', 'USD'), // 'GBPUSD'
    },
  },
  USDCHF_REAL: {
    id: 'USDCHF_REAL',
    base: 'USD',
    quote: 'CHF',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('USD', 'CHF'), // 'USD/CHF'
      pair: getPair('USD', 'CHF'), // 'USDCHF'
    },
  },
  GBPJPY_REAL: {
    id: 'GBPJPY_REAL',
    base: 'GBP',
    quote: 'JPY',
    digits: 3,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('GBP', 'JPY'), // 'GBP/JPY'
      pair: getPair('GBP', 'JPY'), // 'GBPJPY'
    },
  },
  CHFJPY_REAL: {
    id: 'CHFJPY_REAL',
    base: 'CHF',
    quote: 'JPY',
    digits: 3,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('CHF', 'JPY'), // 'CHF/JPY'
      pair: getPair('CHF', 'JPY'), // 'CHFJPY'
    },
  },
  USDCAD_REAL: {
    id: 'USDCAD_REAL',
    base: 'USD',
    quote: 'CAD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('USD', 'CAD'), // 'USD/CAD'
      pair: getPair('USD', 'CAD'), // 'USDCAD'
    },
  },
  USDJPY_REAL: {
    id: 'USDJPY_REAL',
    base: 'USD',
    quote: 'JPY',
    digits: 3,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('USD', 'JPY'), // 'USD/JPY'
      pair: getPair('USD', 'JPY'), // 'USDJPY'
    },
  },
  GBPCHF_REAL: {
    id: 'GBPCHF_REAL',
    base: 'GBP',
    quote: 'CHF',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('GBP', 'CHF'), // 'GBP/CHF'
      pair: getPair('GBP', 'CHF'), // 'GBPCHF'
    },
  },
  EURCAD_REAL: {
    id: 'EURCAD_REAL',
    base: 'EUR',
    quote: 'CAD',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('EUR', 'CAD'), // 'EUR/CAD'
      pair: getPair('EUR', 'CAD'), // 'EURCAD'
    },
  },
  CADJPY_REAL: {
    id: 'CADJPY_REAL',
    base: 'CAD',
    quote: 'JPY',
    digits: 3,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('CAD', 'JPY'), // 'CAD/JPY'
      pair: getPair('CAD', 'JPY'), // 'CADJPY'
    },
  },
  CADCHF_REAL: {
    id: 'CADCHF_REAL',
    base: 'CAD',
    quote: 'CHF',
    digits: 5,
    source: 'real',
    real: {
      provider: 'xchange',
      symbol: getSymbol('CAD', 'CHF'), // 'CAD/CHF'
      pair: getPair('CAD', 'CHF'), // 'CADCHF'
    },
  },
};

export const DEFAULT_INSTRUMENT_ID = 'EURUSD_OTC';

export function getInstrumentIds(): string[] {
  return Object.keys(INSTRUMENTS);
}

export function getInstrument(id: string): InstrumentConfig | undefined {
  return INSTRUMENTS[id];
}

export function getInstrumentOrDefault(id: string | undefined): InstrumentConfig {
  const key = id || DEFAULT_INSTRUMENT_ID;
  const inst = INSTRUMENTS[key];
  if (!inst) return INSTRUMENTS[DEFAULT_INSTRUMENT_ID];
  return inst;
}

/** Resolve instrumentId from symbol "EUR/USD" or id "EURUSD_OTC" */
export function getInstrumentIdBySymbol(symbolOrId: string): string {
  if (!symbolOrId) return DEFAULT_INSTRUMENT_ID;
  const found = Object.entries(INSTRUMENTS).find(
    ([_, c]) => {
      if (c.id === symbolOrId) return true;
      // Унифицированный symbol для всех инструментов (EUR/USD формат)
      if (c.source === 'otc' && c.engine?.asset === symbolOrId) return true;
      if (c.source === 'real' && c.real?.symbol === symbolOrId) return true;
      // Также поддерживаем старый формат pair для обратной совместимости
      if (c.source === 'real' && c.real?.pair === symbolOrId) return true;
      return false;
    },
  );
  return found ? found[0] : symbolOrId.replace(/\//g, '') || DEFAULT_INSTRUMENT_ID;
}
