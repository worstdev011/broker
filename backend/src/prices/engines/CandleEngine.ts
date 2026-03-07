/**
 * Candle Engine - aggregates price ticks into 5s candles
 */

import type { Candle, PriceTick, PriceEvent, Timeframe } from '../PriceTypes.js';
import { CandleStore } from '../store/CandleStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

const BASE_TIMEFRAME_SECONDS = 5; // 5 seconds

export class CandleEngine {
  private activeCandle: Candle | null = null;
  private unsubscribePriceTick: (() => void) | null = null;
  private isRunning = false;
  
  /**
   * FLOW TIME-BASED-CLOSE: Таймер для автоматического закрытия свечи по истечении слота
   * Гарантирует закрытие даже если нет новых тиков (time-based, а не tick-based)
   */
  private closeTimer: NodeJS.Timeout | null = null;

  constructor(
    private instrumentId: string, // instrumentId для агрегации (EURUSD_OTC, EURUSD_REAL)
    private candleStore: CandleStore,
    private eventBus: PriceEventBus,
  ) {}

  /**
   * Start candle engine
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Candle engine is already running');
      return;
    }

    logger.info('Starting candle engine (5s base timeframe, time-based closing)');
    this.isRunning = true;

    // Subscribe to price ticks
    this.unsubscribePriceTick = this.eventBus.on('price_tick', (event) => {
      this.handlePriceTick(event.data as PriceTick);
    });
  }

  /**
   * Stop candle engine
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping candle engine');
    this.isRunning = false;

    if (this.unsubscribePriceTick) {
      this.unsubscribePriceTick();
      this.unsubscribePriceTick = null;
    }

    // FLOW TIME-BASED-CLOSE: Очищаем таймер закрытия
    this.clearCloseTimer();

    // Close current candle if exists
    if (this.activeCandle) {
      this.closeCandle();
    }
  }

  /**
   * Handle price tick
   * 
   * FLOW FIX-CANDLE-TIMING: Закрытие свечей по абсолютным границам времени
   * FLOW TIME-BASED-CLOSE: Дополнительно — таймер гарантирует закрытие без тиков
   * 
   * Алгоритм:
   * 1. Вычисляем текущий слот времени
   * 2. Если свечи нет → открыть + запланировать таймер
   * 3. Если тик в текущем слоте → обновить
   * 4. Если время вышло за слот → закрыть и открыть новую + перепланировать таймер
   */
  private handlePriceTick(tick: PriceTick): void {
    const now = tick.timestamp;
    const timeframeMs = BASE_TIMEFRAME_SECONDS * 1000;
    
    // Вычисляем текущий слот времени
    const slotStart = Math.floor(now / timeframeMs) * timeframeMs;
    const slotEnd = slotStart + timeframeMs;
    
    // 1️⃣ Если свечи нет — открыть
    if (!this.activeCandle) {
      this.openCandle(slotStart, slotEnd, tick);
      this.scheduleCloseTimer(slotEnd);
      return;
    }
    
    // 2️⃣ Проверяем, в каком слоте находится тик
    const currentSlotStart = this.activeCandle.timestamp;
    
    // Если тик находится в том же слоте, что и активная свеча — обновляем
    if (slotStart === currentSlotStart) {
      this.updateCandle(tick);
      return;
    }
    
    // 3️⃣ Если тик в новом слоте — ЗАКРЫТЬ предыдущую свечу
    this.clearCloseTimer();
    this.closeCandle();
    
    // 4️⃣ Открыть новую свечу в новом слоте + запланировать таймер закрытия
    this.openCandle(slotStart, slotEnd, tick);
    this.scheduleCloseTimer(slotEnd);
  }

  /**
   * Open new candle
   * 
   * FLOW FIX-CANDLE-TIMING: Используем переданные slotStart и slotEnd для точного времени
   */
  private openCandle(slotStart: number, slotEnd: number, tick: PriceTick): void {
    this.activeCandle = {
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      timestamp: slotStart, // Нормализованное время начала слота
      timeframe: '5s',
    };

    // Store active candle (per instrumentId)
    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error('Failed to store active candle:', error);
    });

    // Emit event
    const event: PriceEvent = {
      type: 'candle_opened',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }

  /**
   * Update active candle
   */
  private updateCandle(tick: PriceTick): void {
    if (!this.activeCandle) {
      return;
    }

    // Update high/low/close
    this.activeCandle.high = Math.max(this.activeCandle.high, tick.price);
    this.activeCandle.low = Math.min(this.activeCandle.low, tick.price);
    this.activeCandle.close = tick.price;

    // Store updated candle (per instrumentId)
    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error('Failed to store active candle:', error);
    });

    // Emit event
    const event: PriceEvent = {
      type: 'candle_updated',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }

  /**
   * Close current candle
   * 
   * FLOW FIX-CANDLE-TIMING: Закрытие происходит по времени, не по интервалу
   * timestamp свечи уже нормализован, поэтому закрытие происходит ровно в границу слота
   */
  private closeCandle(): void {
    if (!this.activeCandle) {
      return;
    }

    // Store closed candle (per instrumentId)
    this.candleStore.addClosedCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error('Failed to store closed candle:', error);
    });

    // Emit event
    // FLOW FIX-CANDLE-TIMING: timestamp события = время закрытия (slotEnd), а не текущее время
    const slotEnd = this.activeCandle.timestamp + (BASE_TIMEFRAME_SECONDS * 1000);
    const event: PriceEvent = {
      type: 'candle_closed',
      data: this.activeCandle,
      timestamp: slotEnd, // Используем точное время закрытия слота
    };
    
    this.eventBus.emit(event);

    // Clear active candle (новая свеча будет открыта в handlePriceTick или таймером)
    this.activeCandle = null;
  }

  /**
   * FLOW TIME-BASED-CLOSE: Открывает fill-свечу (плоскую) для слота без тиков
   * 
   * OHLC = previousClose — на графике это "_" (чёрточка).
   * Эмитит candle_updated, чтобы фронт получил live-свечу через WebSocket.
   */
  private openFillCandle(slotStart: number, previousClose: number): void {
    this.activeCandle = {
      open: previousClose,
      high: previousClose,
      low: previousClose,
      close: previousClose,
      timestamp: slotStart,
      timeframe: '5s',
    };

    // Store active candle in Redis
    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error('Failed to store fill candle:', error);
    });

    // Emit candle_opened (внутреннее событие)
    this.eventBus.emit({
      type: 'candle_opened',
      data: this.activeCandle,
      timestamp: Date.now(),
    });

    // Emit candle_updated — WebSocket слушает именно это событие
    // Без этого фронт не увидит fill-свечу
    this.eventBus.emit({
      type: 'candle_updated',
      data: this.activeCandle,
      timestamp: Date.now(),
    });

    logger.debug(
      `[CandleEngine] ${this.instrumentId} Fill candle opened at ${new Date(slotStart).toISOString()} (price=${previousClose})`
    );
  }

  /**
   * FLOW TIME-BASED-CLOSE: Планирует таймер для автоматического закрытия свечи
   * 
   * Если к моменту окончания слота не пришёл новый тик, таймер сам закроет свечу
   * и откроет fill-свечу для следующего слота. Это создаёт цепочку:
   * close → openFill → scheduleTimer → close → openFill → ...
   * 
   * Гарантирует time-based поведение: на графике всегда есть live-свеча,
   * даже если тиков нет — отображаются как "_" (flat candles).
   * 
   * @param slotEnd - абсолютное время окончания текущего слота (ms)
   */
  private scheduleCloseTimer(slotEnd: number): void {
    this.clearCloseTimer();
    
    const now = Date.now();
    const delay = Math.max(slotEnd - now, 0);
    
    // Добавляем небольшой буфер (50ms), чтобы дать шанс тику прийти вовремя
    // и закрыть свечу через handlePriceTick (что предпочтительнее)
    const TIMER_BUFFER_MS = 50;
    
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      
      if (!this.activeCandle || !this.isRunning) {
        return;
      }
      
      const timeframeMs = BASE_TIMEFRAME_SECONDS * 1000;
      
      // Проверяем что свеча действительно должна быть закрыта
      const candleSlotEnd = this.activeCandle.timestamp + timeframeMs;
      if (Date.now() >= candleSlotEnd) {
        const previousClose = this.activeCandle.close;
        
        logger.debug(
          `[CandleEngine] ${this.instrumentId} Time-based close: candle at ${new Date(this.activeCandle.timestamp).toISOString()} closed by timer (no tick received)`
        );
        this.closeCandle();
        
        // FLOW TIME-BASED-CLOSE: Открываем fill-свечу для следующего слота
        // Это гарантирует что на графике всегда есть live-свеча
        const nextSlotStart = candleSlotEnd;
        const nextSlotEnd = nextSlotStart + timeframeMs;
        
        // Safety: не создаём fill-свечи если слот слишком далеко в прошлом
        // (например после рестарта сервера или длинной паузы)
        const MAX_FILL_GAP_MS = 60 * 1000; // 60 секунд максимум
        if (Date.now() - nextSlotStart > MAX_FILL_GAP_MS) {
          logger.warn(
            `[CandleEngine] ${this.instrumentId} Fill gap too large (${Math.round((Date.now() - nextSlotStart) / 1000)}s), skipping fill candles. Next tick will resume.`
          );
          return;
        }
        
        this.openFillCandle(nextSlotStart, previousClose);
        this.scheduleCloseTimer(nextSlotEnd);
      }
    }, delay + TIMER_BUFFER_MS);
  }

  /**
   * FLOW TIME-BASED-CLOSE: Очищает таймер закрытия свечи
   */
  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
