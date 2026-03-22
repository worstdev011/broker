/**
 * HTTP terminal snapshot - user/account/trade data only.
 * Chart data (candles, price, market status) is delivered via WS `chart:init`.
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
