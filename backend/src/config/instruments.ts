export interface OtcInstrumentConfig {
  initialPrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number;
  tickIntervalMs: number;
}

export interface RealInstrumentConfig {
  provider: "xchange";
  pair: string;
}

export const OTC_INSTRUMENTS: Record<string, OtcInstrumentConfig> = {
  // Forex OTC
  EURUSD_OTC: { initialPrice: 1.0850,   minPrice: 1.02,   maxPrice: 1.15,    volatility: 0.0002, tickIntervalMs: 500 },
  GBPUSD_OTC: { initialPrice: 1.2650,   minPrice: 1.18,   maxPrice: 1.35,    volatility: 0.0002, tickIntervalMs: 500 },
  USDJPY_OTC: { initialPrice: 149.50,   minPrice: 140.0,  maxPrice: 160.0,   volatility: 0.0002, tickIntervalMs: 500 },
  AUDUSD_OTC: { initialPrice: 0.6550,   minPrice: 0.60,   maxPrice: 0.72,    volatility: 0.0002, tickIntervalMs: 500 },
  USDCAD_OTC: { initialPrice: 1.3650,   minPrice: 1.30,   maxPrice: 1.42,    volatility: 0.0002, tickIntervalMs: 500 },
  USDCHF_OTC: { initialPrice: 0.9000,   minPrice: 0.85,   maxPrice: 0.95,    volatility: 0.0002, tickIntervalMs: 500 },
  AUDCAD_OTC: { initialPrice: 0.9000,   minPrice: 0.85,   maxPrice: 0.96,    volatility: 0.0002, tickIntervalMs: 500 },
  AUDCHF_OTC: { initialPrice: 0.5900,   minPrice: 0.54,   maxPrice: 0.64,    volatility: 0.0002, tickIntervalMs: 500 },
  CADJPY_OTC: { initialPrice: 111.00,   minPrice: 104.0,  maxPrice: 118.0,   volatility: 0.0002, tickIntervalMs: 500 },
  EURJPY_OTC: { initialPrice: 162.00,   minPrice: 152.0,  maxPrice: 172.0,   volatility: 0.0002, tickIntervalMs: 500 },
  GBPJPY_OTC: { initialPrice: 190.00,   minPrice: 178.0,  maxPrice: 202.0,   volatility: 0.0002, tickIntervalMs: 500 },
  NZDUSD_OTC: { initialPrice: 0.6000,   minPrice: 0.55,   maxPrice: 0.66,    volatility: 0.0002, tickIntervalMs: 500 },
  NZDJPY_OTC: { initialPrice: 90.00,    minPrice: 83.0,   maxPrice: 97.0,    volatility: 0.0002, tickIntervalMs: 500 },
  EURCHF_OTC: { initialPrice: 0.9600,   minPrice: 0.91,   maxPrice: 1.01,    volatility: 0.0002, tickIntervalMs: 500 },
  EURNZD_OTC: { initialPrice: 1.7800,   minPrice: 1.70,   maxPrice: 1.87,    volatility: 0.0002, tickIntervalMs: 500 },
  EURGBP_OTC: { initialPrice: 0.8580,   minPrice: 0.82,   maxPrice: 0.90,    volatility: 0.0002, tickIntervalMs: 500 },
  GBPAUD_OTC: { initialPrice: 1.9200,   minPrice: 1.82,   maxPrice: 2.02,    volatility: 0.0002, tickIntervalMs: 500 },
  CHFNOK_OTC: { initialPrice: 12.00,    minPrice: 11.0,   maxPrice: 13.0,    volatility: 0.0003, tickIntervalMs: 500 },
  UAHUSD_OTC: { initialPrice: 0.0245,   minPrice: 0.022,  maxPrice: 0.027,   volatility: 0.0001, tickIntervalMs: 500 },

  // Crypto OTC
  BTCUSD_OTC: { initialPrice: 65000,    minPrice: 30000,  maxPrice: 100000,  volatility: 0.001,  tickIntervalMs: 500 },
  ETHUSD_OTC: { initialPrice: 3200,     minPrice: 1500,   maxPrice: 5000,    volatility: 0.001,  tickIntervalMs: 500 },
  SOLUSD_OTC: { initialPrice: 170.00,   minPrice: 50.0,   maxPrice: 300.0,   volatility: 0.001,  tickIntervalMs: 500 },
  BNBUSD_OTC: { initialPrice: 500.00,   minPrice: 200.0,  maxPrice: 800.0,   volatility: 0.001,  tickIntervalMs: 500 },
};

export const REAL_INSTRUMENTS: Record<string, RealInstrumentConfig> = {
  EURUSD_REAL: { provider: "xchange", pair: "EURUSD" },
  GBPUSD_REAL: { provider: "xchange", pair: "GBPUSD" },
  USDJPY_REAL: { provider: "xchange", pair: "USDJPY" },
  AUDUSD_REAL: { provider: "xchange", pair: "AUDUSD" },
  USDCAD_REAL: { provider: "xchange", pair: "USDCAD" },
  USDCHF_REAL: { provider: "xchange", pair: "USDCHF" },
  EURGBP_REAL: { provider: "xchange", pair: "EURGBP" },
  EURJPY_REAL: { provider: "xchange", pair: "EURJPY" },
  EURAUD_REAL: { provider: "xchange", pair: "EURAUD" },
  EURCAD_REAL: { provider: "xchange", pair: "EURCAD" },
  AUDJPY_REAL: { provider: "xchange", pair: "AUDJPY" },
  AUDCHF_REAL: { provider: "xchange", pair: "AUDCHF" },
  AUDCAD_REAL: { provider: "xchange", pair: "AUDCAD" },
  GBPJPY_REAL: { provider: "xchange", pair: "GBPJPY" },
  GBPCAD_REAL: { provider: "xchange", pair: "GBPCAD" },
  GBPCHF_REAL: { provider: "xchange", pair: "GBPCHF" },
  CADJPY_REAL: { provider: "xchange", pair: "CADJPY" },
  CADCHF_REAL: { provider: "xchange", pair: "CADCHF" },
  CHFJPY_REAL: { provider: "xchange", pair: "CHFJPY" },
};
