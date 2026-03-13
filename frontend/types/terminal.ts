/**
 * HTTP terminal snapshot — user/account/trade data only.
 * Chart data is delivered via WS `chart:init`.
 */
export interface TerminalSnapshot {
  instrument: string;
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
  openTrades: {
    id: string;
    direction: 'CALL' | 'PUT';
    amount: string;
    entryPrice: string;
    openedAt: string;
    expiresAt: number;
    payout: string;
    secondsLeft: number;
  }[];
  serverTime: number;
}

export interface ChartSnapshotCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
}

/**
 * Chart initialization data delivered via WS `chart:init` on subscribe.
 * Single source of truth for all chart data.
 */
export interface ChartSnapshot {
  instrument: string;
  timeframe: string;
  candles: ChartSnapshotCandle[];
  activeCandle: ChartSnapshotCandle | null;
  price: { value: number; timestamp: number } | null;
  serverTime: number;
  marketOpen: boolean;
  marketStatus: 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';
  nextMarketOpenAt: string | null;
  topAlternatives: Array<{
    instrumentId: string;
    label: string;
    payout: number;
  }>;
}
