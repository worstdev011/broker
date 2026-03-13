import type { PriceConfig, PriceTick, PriceEvent } from '../PriceTypes.js';
import { PriceStore } from '../store/PriceStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

export class OtcPriceEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private currentPrice: number;
  private isRunning = false;

  constructor(
    private config: PriceConfig,
    private instrumentId: string,
    private priceStore: PriceStore,
    private eventBus: PriceEventBus,
  ) {
    this.currentPrice = config.initialPrice;
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('OTC price engine already running');
      return;
    }

    logger.info({ asset: this.config.asset }, 'Starting OTC price engine');
    this.isRunning = true;

    this.generateTick();

    this.intervalId = setInterval(() => {
      this.generateTick();
    }, this.config.tickInterval);
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info({ asset: this.config.asset }, 'Stopping OTC price engine');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getCurrentPrice(): PriceTick | null {
    if (!this.isRunning) return null;

    return {
      price: this.currentPrice,
      timestamp: Date.now(),
    };
  }

  private generateTick(): void {
    const changePercent = (Math.random() - 0.5) * 2 * this.config.volatility;
    const change = this.currentPrice * changePercent;

    let newPrice = this.currentPrice + change;

    if (!Number.isFinite(newPrice)) {
      newPrice = this.config.initialPrice;
    }

    if (newPrice < this.config.minPrice) {
      newPrice = this.config.minPrice;
    } else if (newPrice > this.config.maxPrice) {
      newPrice = this.config.maxPrice;
    }

    this.currentPrice = newPrice;

    const tick: PriceTick = {
      price: this.currentPrice,
      timestamp: Date.now(),
    };

    this.priceStore.setCurrentPrice(this.instrumentId, tick).catch((error) => {
      logger.error({ err: error }, 'Failed to store current price');
    });

    const event: PriceEvent = {
      type: 'price_tick',
      data: tick,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }
}
