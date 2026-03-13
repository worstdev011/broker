import type { Candle, PriceTick, PriceEvent } from '../PriceTypes.js';
import { CandleStore } from '../store/CandleStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

const BASE_TIMEFRAME_SECONDS = 5;
const TIMER_BUFFER_MS = 50;
const MAX_FILL_GAP_MS = 60_000;

export class CandleEngine {
  private activeCandle: Candle | null = null;
  private lastClosedCandle: Candle | null = null;
  private unsubscribePriceTick: (() => void) | null = null;
  private isRunning = false;
  private closeTimer: NodeJS.Timeout | null = null;

  constructor(
    private instrumentId: string,
    private candleStore: CandleStore,
    private eventBus: PriceEventBus,
  ) {}

  /** Returns the current in-memory active candle (always up-to-date, no async). */
  getActiveCandle(): Candle | null {
    return this.activeCandle ? { ...this.activeCandle } : null;
  }

  /** Returns the last closed candle kept in memory (may not be in DB yet). */
  getLastClosedCandle(): Candle | null {
    return this.lastClosedCandle ? { ...this.lastClosedCandle } : null;
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Candle engine already running');
      return;
    }

    logger.info('Starting candle engine (5s base timeframe, time-based closing)');
    this.isRunning = true;

    this.unsubscribePriceTick = this.eventBus.on('price_tick', (event) => {
      this.handlePriceTick(event.data as PriceTick);
    });
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info('Stopping candle engine');
    this.isRunning = false;

    if (this.unsubscribePriceTick) {
      this.unsubscribePriceTick();
      this.unsubscribePriceTick = null;
    }

    this.clearCloseTimer();

    if (this.activeCandle) {
      this.closeCandle();
    }
  }

  /**
   * Closes candles by absolute time slot boundaries.
   * Timer guarantees closure even without incoming ticks.
   */
  private handlePriceTick(tick: PriceTick): void {
    if (!Number.isFinite(tick.price) || tick.price <= 0) return;
    if (!Number.isFinite(tick.timestamp)) return;

    const now = tick.timestamp;
    const timeframeMs = BASE_TIMEFRAME_SECONDS * 1_000;

    const slotStart = Math.floor(now / timeframeMs) * timeframeMs;
    const slotEnd = slotStart + timeframeMs;

    if (!this.activeCandle) {
      this.openCandle(slotStart, slotEnd, tick);
      this.scheduleCloseTimer(slotEnd);
      return;
    }

    const currentSlotStart = this.activeCandle.timestamp;

    if (slotStart === currentSlotStart) {
      this.updateCandle(tick);
      return;
    }

    this.clearCloseTimer();
    this.closeCandle();

    this.openCandle(slotStart, slotEnd, tick);
    this.scheduleCloseTimer(slotEnd);
  }

  private openCandle(slotStart: number, _slotEnd: number, tick: PriceTick): void {
    this.activeCandle = {
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      timestamp: slotStart,
      timeframe: '5s',
    };

    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error({ err: error }, 'Failed to store active candle');
    });

    const event: PriceEvent = {
      type: 'candle_opened',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }

  private updateCandle(tick: PriceTick): void {
    if (!this.activeCandle) return;

    this.activeCandle.high = Math.max(this.activeCandle.high, tick.price);
    this.activeCandle.low = Math.min(this.activeCandle.low, tick.price);
    this.activeCandle.close = tick.price;

    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error({ err: error }, 'Failed to store active candle');
    });

    const event: PriceEvent = {
      type: 'candle_updated',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }

  private closeCandle(): void {
    if (!this.activeCandle) return;

    this.lastClosedCandle = { ...this.activeCandle };

    this.candleStore.addClosedCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error({ err: error }, 'Failed to store closed candle');
    });

    const slotEnd = this.activeCandle.timestamp + (BASE_TIMEFRAME_SECONDS * 1_000);
    const event: PriceEvent = {
      type: 'candle_closed',
      data: this.activeCandle,
      timestamp: slotEnd,
    };

    this.eventBus.emit(event);
    this.activeCandle = null;
  }

  /** Opens a flat fill candle (OHLC = previousClose) for slots without ticks */
  private openFillCandle(slotStart: number, previousClose: number): void {
    this.activeCandle = {
      open: previousClose,
      high: previousClose,
      low: previousClose,
      close: previousClose,
      timestamp: slotStart,
      timeframe: '5s',
    };

    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error({ err: error }, 'Failed to store fill candle');
    });

    this.eventBus.emit({
      type: 'candle_opened',
      data: this.activeCandle,
      timestamp: Date.now(),
    });

    this.eventBus.emit({
      type: 'candle_updated',
      data: this.activeCandle,
      timestamp: Date.now(),
    });
  }

  /**
   * Schedules timer for automatic candle close at slotEnd.
   * Creates a chain: close -> openFill -> scheduleTimer -> close -> ...
   */
  private scheduleCloseTimer(slotEnd: number): void {
    this.clearCloseTimer();

    const now = Date.now();
    const delay = Math.max(slotEnd - now, 0);

    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;

      if (!this.activeCandle || !this.isRunning) return;

      const timeframeMs = BASE_TIMEFRAME_SECONDS * 1_000;
      const candleSlotEnd = this.activeCandle.timestamp + timeframeMs;

      if (Date.now() >= candleSlotEnd) {
        const previousClose = this.activeCandle.close;

        this.closeCandle();

        const nextSlotStart = candleSlotEnd;
        const nextSlotEnd = nextSlotStart + timeframeMs;

        if (Date.now() - nextSlotStart > MAX_FILL_GAP_MS) {
          logger.warn(
            { instrumentId: this.instrumentId, gapSeconds: Math.round((Date.now() - nextSlotStart) / 1_000) },
            'Fill gap too large, skipping fill candles',
          );
          return;
        }

        this.openFillCandle(nextSlotStart, previousClose);
        this.scheduleCloseTimer(nextSlotEnd);
      }
    }, delay + TIMER_BUFFER_MS);
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
