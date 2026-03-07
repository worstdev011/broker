/**
 * FLOW P2 — PriceEngineManager
 *
 * Один класс — много инстансов engines per instrument.
 * Map<instrumentId, { priceEngine, candleEngine, aggregator, eventBus }>
 */

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
import { INSTRUMENTS, getInstrumentOrDefault } from '../config/instruments.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

const CANDLE_CONFIG = {
  baseTimeframe: '5s' as const,
  aggregationTimeframes: [
    '10s', '15s', '30s', '1m', '2m', '3m', '5m', 
    '10m', '15m', '30m', '1h', '4h', '1d'
  ] as Timeframe[], // Агрегируем все таймфреймы из 5s свечей
};

interface InstrumentEngines {
  /** OtcPriceEngine для OTC-инструментов, null для REAL (управляются через RealWebSocketHub) */
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
  /** Единый WebSocket hub для ВСЕХ real-инструментов (вместо N отдельных соединений) */
  private realHub: RealWebSocketHub | null = null;
  private isRunning = false;

  /**
   * Get event bus for instrument (for WebSocket)
   */
  getEventBus(instrumentId: string): PriceEventBus | null {
    return this.engines.get(instrumentId)?.eventBus ?? null;
  }

  /**
   * Get all instrument ids (for WS bootstrap)
   */
  getInstrumentIds(): string[] {
    return Array.from(this.engines.keys());
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Price engine manager already running');
      return;
    }

    logger.info('Starting PriceEngineManager (multi-instrument)...');

    // FLOW HUB: Создаем единый WebSocket hub для ВСЕХ real-инструментов
    // Вместо N отдельных соединений — одно, без 429 rate limit
    const apiKey = env.XCHANGE_API_KEY;
    let realInstrumentCount = 0;

    if (apiKey) {
      this.realHub = new RealWebSocketHub(apiKey);
    }

    for (const [instrumentId, config] of Object.entries(INSTRUMENTS)) {
      // Унифицированный symbol для всех инструментов (EUR/USD формат)
      let symbol: string;
      if (config.source === 'otc') {
        if (!config.engine) {
          logger.error(`[PriceEngineManager] OTC instrument ${instrumentId} missing engine config`);
          continue;
        }
        symbol = config.engine.asset;
      } else if (config.source === 'real') {
        if (!config.real) {
          logger.error(`[PriceEngineManager] Real instrument ${instrumentId} missing real config`);
          continue;
        }
        symbol = config.real.symbol;
      } else {
        logger.error(`[PriceEngineManager] Unknown source for ${instrumentId}: ${(config as any).source}`);
        continue;
      }

      logger.debug(`🔧 Initializing engines for ${instrumentId} (${symbol}, source: ${config.source})`);

      const eventBus = new PriceEventBus();

      // FLOW R6: Создаем engine в зависимости от источника
      let priceEngine: OtcPriceEngine | null = null;

      if (config.source === 'otc') {
        // OTC engine — индивидуальный генератор цен
        priceEngine = new OtcPriceEngine(
          config.engine!,
          instrumentId,
          this.priceStore,
          eventBus,
        );
      } else if (config.source === 'real') {
        // FLOW HUB: Real инструменты — подписываемся через единый hub
        if (!this.realHub) {
          logger.error(`[PriceEngineManager] Real instrument ${instrumentId} requires XCHANGE_API_KEY. Set it in .env`);
          continue;
        }
        // Регистрируем пару в hub — он будет роутить тики в этот eventBus
        this.realHub.subscribe(config.real!.pair, instrumentId, eventBus);
        realInstrumentCount++;
      } else {
        logger.error(`[PriceEngineManager] Unknown source for ${instrumentId}: ${(config as any).source}`);
        continue;
      }

      // CandleEngine и Aggregator работают для всех источников
      const candleEngine = new CandleEngine(instrumentId, this.candleStore, eventBus);
      const aggregator = new TimeframeAggregator(
        instrumentId,
        CANDLE_CONFIG.aggregationTimeframes,
        this.candleStore,
        eventBus,
      );

      // Запускаем только OTC engine (REAL тики приходят через hub)
      if (priceEngine) {
        priceEngine.start();
      }
      candleEngine.start();
      aggregator.start();

      // FLOW R-LINE-2: Подписываемся на price_tick для записи price points
      eventBus.on('price_tick', (event) => {
        if (event.type === 'price_tick') {
          const tick = event.data as PriceTick;
          this.pricePointWriter.handleTick(instrumentId, tick.price, tick.timestamp).catch((error) => {
            logger.error(`[PriceEngineManager] Failed to write price point for ${instrumentId}:`, error);
          });
        }
      });

      this.engines.set(instrumentId, {
        priceEngine,
        candleEngine,
        aggregator,
        eventBus,
      });
      
      logger.debug(`✅ Engines started for ${instrumentId} (${config.source})`);
    }

    // FLOW HUB: Запускаем hub ПОСЛЕ регистрации всех подписчиков
    // Одно соединение на все real-пары вместо N отдельных
    if (this.realHub && realInstrumentCount > 0) {
      this.realHub.start();
      logger.info(`✅ RealWebSocketHub started (${realInstrumentCount} real pairs via 1 WebSocket connection)`);
    }

    this.isRunning = true;
    logger.info(`✅ PriceEngineManager started (${this.engines.size} instruments)`);
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info('Stopping PriceEngineManager...');

    // Останавливаем единый hub для real-инструментов
    if (this.realHub) {
      this.realHub.stop();
      this.realHub = null;
    }

    for (const [id, { priceEngine, candleEngine, aggregator }] of this.engines) {
      // priceEngine есть только у OTC инструментов (REAL управляются через hub)
      if (priceEngine) {
        priceEngine.stop();
      }
      candleEngine.stop();
      aggregator.stop();
    }
    this.engines.clear();
    this.isRunning = false;
    logger.info('✅ PriceEngineManager stopped');
  }

  /**
   * FLOW CANDLE-SNAPSHOT: Получить активные (незакрытые) свечи для инструмента
   * Возвращает Map<timeframe, Candle> для всех таймфреймов, где есть активная свеча
   * Используется для отправки snapshot при подключении клиента через WebSocket
   */
  async getActiveCandles(instrumentId: string): Promise<Map<string, Candle>> {
    const result = new Map<string, Candle>();
    const eng = this.engines.get(instrumentId);
    if (!eng) return result;

    // 1. Base 5s candle from Redis (CandleStore)
    try {
      const activeCandle = await this.candleStore.getActiveCandle(instrumentId);
      if (activeCandle) {
        result.set('5s', activeCandle);
      }
    } catch (error) {
      logger.error(`[PriceEngineManager] Failed to get active 5s candle for ${instrumentId}:`, error);
    }

    // 2. Aggregated candles from TimeframeAggregator (in-memory)
    const aggregatedCandles = eng.aggregator.getAllActiveCandles();
    for (const [timeframe, candle] of aggregatedCandles) {
      if (candle) {
        result.set(timeframe, candle);
      }
    }

    return result;
  }

  /**
   * Get current price for instrument (id = EURUSD_OTC, EURUSD_REAL, …)
   */
  async getCurrentPrice(instrumentId: string): Promise<PriceTick | null> {
    const eng = this.engines.get(instrumentId);
    if (!this.isRunning || !eng) return null;
    
    // OTC: получаем из priceEngine напрямую
    // REAL: priceEngine = null, получаем из PriceStore (Redis)
    const price = eng.priceEngine?.getCurrentPrice() ?? null;
    if (price) return price;
    
    // Fallback: получаем из PriceStore (Redis)
    return this.priceStore.getCurrentPrice(instrumentId);
  }

  /**
   * Get candles for instrument + timeframe
   */
  async getCandles(instrumentId: string, timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    if (!this.isRunning) return [];
    // Используем instrumentId напрямую для разделения OTC и REAL источников
    return this.candleStore.getClosedCandles(instrumentId, timeframe, limit);
  }

  /**
   * Get closed candles before time (for history loading)
   */
  async getCandlesBefore(
    instrumentId: string,
    timeframe: Timeframe,
    toTime: number,
    limit: number = 200,
  ): Promise<Candle[]> {
    if (!this.isRunning) return [];
    // Используем instrumentId напрямую для разделения OTC и REAL источников
    return this.candleStore.getClosedCandlesBefore(instrumentId, timeframe, toTime, limit);
  }
}
