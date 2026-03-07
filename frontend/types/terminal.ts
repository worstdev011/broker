/**
 * Terminal snapshot types (aligned with backend)
 * FLOW P4: snapshot includes instrument
 */

export interface TerminalSnapshot {
  instrument: string; // EURUSD_OTC, EURUSD_REAL, AUDCAD_OTC
  user: {
    id: string;
    email: string;
  };
  accounts: {
    id: string;
    type: 'demo' | 'real';
    balance: string;
    currency: string;
    isActive: boolean;
  }[];
  activeAccount: {
    id: string;
    type: 'demo' | 'real';
    balance: string;
    currency: string;
  } | null;
  price: {
    asset: string;
    value: number;
    timestamp: number;
  } | null; // FLOW C-MARKET-CLOSED: может быть null когда рынок закрыт
  candles: {
    timeframe: string;
    items: {
      open: number;
      high: number;
      low: number;
      close: number;
      startTime: number;
      endTime: number;
    }[];
  };
  openTrades: {
    id: string;
    direction: 'CALL' | 'PUT';
    amount: string;
    entryPrice: string;
    /** ISO string; нужен для восстановления оверлея после перезагрузки */
    openedAt?: string;
    expiresAt: number;
    payout: string;
  }[];
  serverTime: number;
  // FLOW C-MARKET-CLOSED: статус рынка
  marketOpen: boolean;
  marketStatus: 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';
  // FLOW C-MARKET-COUNTDOWN: время следующего открытия рынка (ISO string UTC)
  nextMarketOpenAt: string | null;
  // FLOW C-MARKET-ALTERNATIVES: топ-5 альтернативных пар с наибольшей доходностью
  topAlternatives: Array<{
    instrumentId: string;
    label: string;
    payout: number;
  }>;
}
