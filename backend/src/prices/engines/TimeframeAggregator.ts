import type { Candle, Timeframe, PriceEvent } from '../PriceTypes.js';
import { CandleStore } from '../store/CandleStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '2m': 120,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '30m': 1_800,
  '1h': 3_600,
  '4h': 14_400,
  '1d': 86_400,
};

export class TimeframeAggregator {
  private aggregators: Map<Timeframe, Candle | null> = new Map();
  private lastClosedCandles: Map<Timeframe, Candle> = new Map();
  private unsubscribeCandleClosed: (() => void) | null = null;
  private isRunning = false;

  constructor(
    private instrumentId: string,
    private timeframes: Timeframe[],
    private candleStore: CandleStore,
    private eventBus: PriceEventBus,
  ) {
    for (const tf of this.timeframes) {
      this.aggregators.set(tf, null);
    }
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Timeframe aggregator already running');
      return;
    }

    logger.info({ timeframes: this.timeframes.join(', ') }, 'Starting timeframe aggregator');
    this.isRunning = true;

    this.unsubscribeCandleClosed = this.eventBus.on('candle_closed', (event) => {
      const candle = event.data as Candle;
      if (candle.timeframe === '5s') {
        this.handleBaseCandle(candle);
      }
    });
  }

  getActiveCandle(timeframe: Timeframe): Candle | null {
    return this.aggregators.get(timeframe) ?? null;
  }

  getAllActiveCandles(): Map<Timeframe, Candle | null> {
    return new Map(this.aggregators);
  }

  /** Returns the last closed candle for a timeframe (may not be in DB yet). */
  getLastClosedCandle(timeframe: Timeframe): Candle | null {
    return this.lastClosedCandles.get(timeframe) ?? null;
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info('Stopping timeframe aggregator');
    this.isRunning = false;

    if (this.unsubscribeCandleClosed) {
      this.unsubscribeCandleClosed();
      this.unsubscribeCandleClosed = null;
    }

    this.aggregators.clear();
    for (const tf of this.timeframes) {
      this.aggregators.set(tf, null);
    }
  }

  private handleBaseCandle(baseCandle: Candle): void {
    for (const timeframe of this.timeframes) {
      this.aggregateCandle(baseCandle, timeframe);
    }
  }

  /**
   * Aggregated candle closes when the last 5s candle of the period ends
   * (its endTime reaches the aggregated period boundary).
   */
  private aggregateCandle(baseCandle: Candle, timeframe: Timeframe): void {
    const timeframeSeconds = TIMEFRAME_SECONDS[timeframe];
    const timeframeMs = timeframeSeconds * 1_000;
    const baseTimeframeMs = 5_000;

    const candleStart = Math.floor(baseCandle.timestamp / timeframeMs) * timeframeMs;
    const baseCandleEndTime = baseCandle.timestamp + baseTimeframeMs;
    const aggregatedCandleEndTime = candleStart + timeframeMs;

    let aggregator = this.aggregators.get(timeframe);

    if (!aggregator || aggregator.timestamp !== candleStart) {
      if (aggregator) {
        this.closeAggregatedCandle(aggregator);
      }

      const previousClose = aggregator ? aggregator.close : baseCandle.open;

      aggregator = {
        open: previousClose,
        high: baseCandle.high,
        low: baseCandle.low,
        close: baseCandle.close,
        timestamp: candleStart,
        timeframe,
      };

      this.aggregators.set(timeframe, aggregator);
    } else {
      aggregator.high = Math.max(aggregator.high, baseCandle.high);
      aggregator.low = Math.min(aggregator.low, baseCandle.low);
      aggregator.close = baseCandle.close;

      this.aggregators.set(timeframe, aggregator);
    }

    if (baseCandleEndTime >= aggregatedCandleEndTime) {
      if (aggregator) {
        this.closeAggregatedCandle(aggregator);
        this.aggregators.set(timeframe, null);
      }
    }
  }

  private closeAggregatedCandle(candle: Candle): void {
    this.lastClosedCandles.set(candle.timeframe as Timeframe, { ...candle });

    this.candleStore.addClosedCandle(this.instrumentId, candle).catch((error) => {
      logger.error({ err: error, timeframe: candle.timeframe }, 'Failed to store closed candle');
    });

    const timeframeSeconds = TIMEFRAME_SECONDS[candle.timeframe as Timeframe];
    const slotEnd = candle.timestamp + (timeframeSeconds * 1_000);

    const event: PriceEvent = {
      type: 'candle_closed',
      data: candle,
      timestamp: slotEnd,
    };

    this.eventBus.emit(event);
  }
}
