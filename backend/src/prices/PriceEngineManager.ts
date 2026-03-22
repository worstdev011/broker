import type { PriceTick, Timeframe } from './PriceTypes.js';
import type { Candle } from './PriceTypes.js';
import { OtcPriceEngine } from './engines/OtcPriceEngine.js';
import { RealWebSocketHub } from './engines/RealWebSocketHub.js';
import { CandleEngine } from './engines/CandleEngine.js';
import { TimeframeAggregator } from './engines/TimeframeAggregator.js';
import { PriceStore } from './store/PriceStore.js';
import { CandleStore } from './store/CandleStore.js';
import { PriceEventBus } from './events/PriceEventBus.js';
import { PricePointWriter } from './PricePointWriter.js';
import { INSTRUMENTS } from '../config/instruments.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

const CANDLE_CONFIG = {
  baseTimeframe: '5s' as const,
  aggregationTimeframes: [
    '10s', '15s', '30s', '1m', '2m', '3m', '5m',
    '10m', '15m', '30m', '1h', '4h', '1d',
  ] as Timeframe[],
};

interface InstrumentEngines {
  priceEngine: OtcPriceEngine | null;
  candleEngine: CandleEngine;
  aggregator: TimeframeAggregator;
  eventBus: PriceEventBus;
}

export class PriceEngineManager {
  private priceStore = new PriceStore();
  private candleStore = new CandleStore();
  private pricePointWriter = new PricePointWriter();
  private engines = new Map<string, InstrumentEngines>();
  private realHub: RealWebSocketHub | null = null;
  private isRunning = false;

  getEventBus(instrumentId: string): PriceEventBus | null {
    return this.engines.get(instrumentId)?.eventBus ?? null;
  }

  getInstrumentIds(): string[] {
    return Array.from(this.engines.keys());
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Price engine manager already running');
      return;
    }

    logger.info('Starting PriceEngineManager (multi-instrument)');

    const apiKey = env.XCHANGE_API_KEY;
    let realInstrumentCount = 0;

    if (apiKey) {
      this.realHub = new RealWebSocketHub(apiKey);
    }

    for (const [instrumentId, config] of Object.entries(INSTRUMENTS)) {
      let symbol: string;

      if (config.source === 'otc') {
        if (!config.engine) {
          logger.error({ instrumentId }, 'OTC instrument missing engine config');
          continue;
        }
        symbol = config.engine.asset;
      } else if (config.source === 'real') {
        if (!config.real) {
          logger.error({ instrumentId }, 'Real instrument missing real config');
          continue;
        }
        symbol = config.real.symbol;
      } else {
        logger.error({ instrumentId, source: (config as any).source }, 'Unknown instrument source');
        continue;
      }

      logger.debug({ instrumentId, symbol, source: config.source }, 'Initializing engines');

      const eventBus = new PriceEventBus();
      let priceEngine: OtcPriceEngine | null = null;

      if (config.source === 'otc') {
        priceEngine = new OtcPriceEngine(
          config.engine!,
          instrumentId,
          this.priceStore,
          eventBus,
        );
      } else if (config.source === 'real') {
        if (!this.realHub) {
          logger.error({ instrumentId }, 'Real instrument requires XCHANGE_API_KEY');
          continue;
        }
        this.realHub.subscribe(config.real!.pair, instrumentId, eventBus);
        realInstrumentCount++;
      }

      const candleEngine = new CandleEngine(instrumentId, this.candleStore, eventBus);
      const aggregator = new TimeframeAggregator(
        instrumentId,
        CANDLE_CONFIG.aggregationTimeframes,
        this.candleStore,
        eventBus,
      );

      if (priceEngine) {
        priceEngine.start();
      }
      candleEngine.start();
      aggregator.start();

      eventBus.on('price_tick', (event) => {
        if (event.type === 'price_tick') {
          const tick = event.data as PriceTick;
          this.pricePointWriter.handleTick(instrumentId, tick.price, tick.timestamp).catch((error) => {
            logger.error({ err: error, instrumentId }, 'Failed to write price point');
          });
          if (!priceEngine) {
            this.priceStore.setCurrentPrice(instrumentId, tick).catch((error) => {
              logger.error({ err: error, instrumentId }, 'Failed to store real price');
            });
          }
        }
      });

      this.engines.set(instrumentId, {
        priceEngine,
        candleEngine,
        aggregator,
        eventBus,
      });

      logger.debug({ instrumentId, source: config.source }, 'Engines started');
    }

    if (this.realHub && realInstrumentCount > 0) {
      this.realHub.start();
      logger.info({ count: realInstrumentCount }, 'RealWebSocketHub started');
    }

    this.isRunning = true;
    logger.info({ count: this.engines.size }, 'PriceEngineManager started');
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info('Stopping PriceEngineManager');

    if (this.realHub) {
      this.realHub.stop();
      this.realHub = null;
    }

    for (const [, { priceEngine, candleEngine, aggregator }] of this.engines) {
      if (priceEngine) {
        priceEngine.stop();
      }
      candleEngine.stop();
      aggregator.stop();
    }
    this.engines.clear();
    this.isRunning = false;
    logger.info('PriceEngineManager stopped');
  }

  /**
   * Returns active (in-progress) candles for all timeframes.
   * Reads from in-memory state - always consistent, no async lag.
   */
  getActiveCandles(instrumentId: string): Map<string, Candle> {
    const result = new Map<string, Candle>();
    const eng = this.engines.get(instrumentId);
    if (!eng) return result;

    const activeCandle = eng.candleEngine.getActiveCandle();
    if (activeCandle) {
      result.set('5s', activeCandle);
    }

    const aggregatedCandles = eng.aggregator.getAllActiveCandles();
    for (const [timeframe, candle] of aggregatedCandles) {
      if (candle) {
        result.set(timeframe, candle);
      }
    }

    return result;
  }

  async getCurrentPrice(instrumentId: string): Promise<PriceTick | null> {
    const eng = this.engines.get(instrumentId);
    if (!this.isRunning || !eng) return null;

    const price = eng.priceEngine?.getCurrentPrice() ?? null;
    if (price) return price;

    return this.priceStore.getCurrentPrice(instrumentId);
  }

  async getCandles(instrumentId: string, timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    if (!this.isRunning) return [];

    const candles = await this.candleStore.getClosedCandles(instrumentId, timeframe, limit);

    // Supplement with in-memory last closed candle that may not be in DB yet
    const eng = this.engines.get(instrumentId);
    if (eng) {
      const lastClosed = timeframe === '5s'
        ? eng.candleEngine.getLastClosedCandle()
        : eng.aggregator.getLastClosedCandle(timeframe);
      if (lastClosed) {
        const lastDbTs = candles.length > 0 ? candles[candles.length - 1]!.timestamp : 0;
        if (lastClosed.timestamp > lastDbTs) {
          candles.push(lastClosed);
        }
      }
    }

    return candles;
  }

  async getCandlesBefore(
    instrumentId: string,
    timeframe: Timeframe,
    toTime: number,
    limit: number = 200,
  ): Promise<Candle[]> {
    if (!this.isRunning) return [];
    return this.candleStore.getClosedCandlesBefore(instrumentId, timeframe, toTime, limit);
  }
}
