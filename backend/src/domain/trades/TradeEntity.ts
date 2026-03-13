import { TradeDirection, TradeStatus } from './TradeTypes.js';

export class TradeEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly accountId: string,
    public readonly direction: TradeDirection,
    public readonly instrument: string,
    public readonly amount: number,
    public readonly entryPrice: number,
    public exitPrice: number | null,
    public readonly payout: number,
    public status: TradeStatus,
    public readonly openedAt: Date,
    public readonly expiresAt: Date,
    public closedAt: Date | null,
  ) {}

  determineResult(): TradeStatus {
    if (this.exitPrice === null) {
      throw new Error('Cannot determine result: exit price is not set');
    }

    if (this.exitPrice === this.entryPrice) {
      return TradeStatus.TIE;
    }

    if (this.direction === TradeDirection.CALL) {
      return this.exitPrice > this.entryPrice ? TradeStatus.WIN : TradeStatus.LOSS;
    } else {
      return this.exitPrice < this.entryPrice ? TradeStatus.WIN : TradeStatus.LOSS;
    }
  }

  calculatePayoutAmount(): number {
    return this.amount * this.payout;
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  isOpen(): boolean {
    return this.status === TradeStatus.OPEN;
  }
}
