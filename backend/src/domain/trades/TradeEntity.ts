/**
 * Trade entity - domain entity for trades
 */

import type { Trade } from './TradeTypes.js';
import { TradeDirection, TradeStatus } from './TradeTypes.js';

export class TradeEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly accountId: string,
    public readonly direction: TradeDirection,
    public readonly instrument: string, // Trading instrument (e.g., 'EURUSD_OTC', 'AUDCHF_REAL')
    public readonly amount: number,
    public readonly entryPrice: number,
    public exitPrice: number | null,
    public readonly payout: number,
    public status: TradeStatus,
    public readonly openedAt: Date,
    public readonly expiresAt: Date,
    public closedAt: Date | null,
  ) {}

  /**
   * Determine trade result: WIN, LOSS, or TIE
   * 
   * TIE (ничья): exitPrice === entryPrice → возврат ставки
   */
  determineResult(): TradeStatus {
    if (this.exitPrice === null) {
      throw new Error('Cannot determine result: exit price is not set');
    }

    // 🔥 TIE: Цена не изменилась → возврат ставки
    if (this.exitPrice === this.entryPrice) {
      return TradeStatus.TIE;
    }

    if (this.direction === TradeDirection.CALL) {
      // CALL: exitPrice > entryPrice → WIN
      return this.exitPrice > this.entryPrice ? TradeStatus.WIN : TradeStatus.LOSS;
    } else {
      // PUT: exitPrice < entryPrice → WIN
      return this.exitPrice < this.entryPrice ? TradeStatus.WIN : TradeStatus.LOSS;
    }
  }

  /**
   * Calculate payout amount (amount * payout percentage)
   */
  calculatePayoutAmount(): number {
    return this.amount * this.payout;
  }

  /**
   * Check if trade is expired
   */
  isExpired(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  /**
   * Check if trade is open
   */
  isOpen(): boolean {
    return this.status === TradeStatus.OPEN;
  }
}
