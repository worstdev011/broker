import { EventEmitter } from "node:events";
import { OTC_INSTRUMENTS, type OtcInstrumentConfig } from "../../config/instruments.js";

export interface PriceTick {
  instrumentId: string;
  price: number;
  timestamp: number;
}

const DEFAULT_CONFIG: OtcInstrumentConfig = {
  initialPrice: 1.0,
  minPrice: 0.01,
  maxPrice: 1000000,
  volatility: 0.0002,
  tickIntervalMs: 500,
};

export class OtcPriceEngine extends EventEmitter {
  private currentPrice: number;
  private readonly config: OtcInstrumentConfig;
  private readonly instrumentId: string;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(instrumentId: string) {
    super();
    this.instrumentId = instrumentId;
    this.config = OTC_INSTRUMENTS[instrumentId] ?? DEFAULT_CONFIG;
    this.currentPrice = this.config.initialPrice;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.generateTick(), this.config.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getPrice(): number {
    return this.currentPrice;
  }

  private generateTick(): void {
    const changePercent = (Math.random() - 0.5) * 2 * this.config.volatility;
    let newPrice = this.currentPrice + this.currentPrice * changePercent;

    if (!Number.isFinite(newPrice)) newPrice = this.config.initialPrice;
    if (newPrice < this.config.minPrice) newPrice = this.config.minPrice;
    if (newPrice > this.config.maxPrice) newPrice = this.config.maxPrice;

    this.currentPrice = newPrice;

    this.emit("tick", {
      instrumentId: this.instrumentId,
      price: this.currentPrice,
      timestamp: Date.now(),
    } satisfies PriceTick);
  }
}
