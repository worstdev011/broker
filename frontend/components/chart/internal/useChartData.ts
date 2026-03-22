import { useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Candle, SnapshotCandle } from './chart.types';

const MAX_CANDLES = 3000;
const MAX_REAL_START_TIMES = 6000;

export type MarketStatus = 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';

interface UseChartDataParams {
  onDataChange?: () => void;
  timeframeMs?: number;
}

interface UseChartDataReturn {
  initializeFromSnapshot: (
    candles: SnapshotCandle[],
    currentPrice: number | null,
    currentTime: number,
    timeframeMs: number,
    marketStatus: MarketStatus,
    nextMarketOpenAt?: string | null,
    topAlternatives?: Array<{ instrumentId: string; label: string; payout: number }>,
    activeCandle?: SnapshotCandle | null,
  ) => void;
  handlePriceUpdate: (price: number, timestamp: number) => void;
  handleCandleClose: (
    closedCandle: SnapshotCandle,
    nextCandleStartTime: number,
    actualTimeframeMs?: number
  ) => void;
  applyActiveCandleSnapshot: (candle: { open: number; high: number; low: number; close: number; timestamp: number }) => void;
  prependCandles: (newCandles: SnapshotCandle[], timeframeMs: number) => void;
  reset: () => void;
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  getEarliestRealTime: () => number | null;
  getMarketStatus: () => MarketStatus;
  getNextMarketOpenAt: () => number | null;
  getTopAlternatives: () => Array<{ instrumentId: string; label: string; payout: number }>;
  isInitialized: () => boolean;
}

/** Normalizes a candle, fixing OHLC invariants and invalid price values. */
function normalizeCandle(candle: Candle): Candle {
  const maxOpenClose = Math.max(candle.open, candle.close);
  const high = Math.max(candle.high, maxOpenClose);

  const minOpenClose = Math.min(candle.open, candle.close);
  const low = Math.min(candle.low, minOpenClose);

  const safePrice = (value: number, fallback?: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
      if (fallback !== undefined && Number.isFinite(fallback) && fallback > 0) {
        logger.warn('[normalizeCandle] Using fallback for invalid price:', value, '→', fallback);
        return fallback;
      }
      logger.error('[normalizeCandle] Invalid price value with no fallback, using 1.0:', value);
      return 1.0; // Минимальная разумная цена (для валютных пар)
    }
    return value;
  };

  // Use current time as fallback for invalid timestamps
  const safeTime = (value: number): number => {
    if (!Number.isFinite(value)) {
      logger.warn('[normalizeCandle] Invalid time value, using current time:', value);
      return Date.now();
    }
    return value;
  };

  let safeClose = safePrice(candle.close);
  
  // If close fell back to 1.0, try using other OHLC values as source of truth
  if (safeClose === 1.0 && (!Number.isFinite(candle.close) || candle.close <= 0)) {
    const candidates = [candle.open, candle.high, candle.low].filter(v => Number.isFinite(v) && v > 0);
    if (candidates.length > 0) {
      safeClose = Math.max(...candidates);
      logger.warn('[normalizeCandle] Using max(open,high,low) as close fallback:', safeClose);
    }
  }
  
  const safeOpen = safePrice(candle.open, safeClose);
  const safeHigh = safePrice(high, Math.max(safeOpen, safeClose));
  const safeLow = safePrice(low, Math.min(safeOpen, safeClose));

  return {
    open: safeOpen,
    high: safeHigh,
    low: safeLow,
    close: safeClose,
    startTime: safeTime(candle.startTime),
    endTime: safeTime(candle.endTime),
    isClosed: candle.isClosed,
  };
}

/** Creates a new live (unclosed) candle. */
function createLiveCandle(
  open: number,
  startTime: number,
  currentPrice: number,
  currentTime: number
): Candle {
  return normalizeCandle({
    open,
    high: Math.max(open, currentPrice),
    low: Math.min(open, currentPrice),
    close: currentPrice,
    startTime,
    endTime: currentTime,
    isClosed: false,
  });
}

export function useChartData({ onDataChange, timeframeMs: defaultTimeframeMs = 5000 }: UseChartDataParams = {}): UseChartDataReturn {
  const candlesRef = useRef<Candle[]>([]);
  const liveCandleRef = useRef<Candle | null>(null);
  const earliestRealTimeRef = useRef<number | null>(null);
  const realStartTimesRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef<boolean>(false);
  const marketStatusRef = useRef<MarketStatus>('OPEN');
  const nextMarketOpenAtRef = useRef<number | null>(null);
  const topAlternativesRef = useRef<Array<{
    instrumentId: string;
    label: string;
    payout: number;
  }>>([]);

  const initializeFromSnapshot = (
    snapshotCandles: SnapshotCandle[],
    currentPrice: number | null,
    currentTime: number,
    timeframeMs: number,
    marketStatus: MarketStatus,
    nextMarketOpenAt?: string | null,
    topAlternatives?: Array<{ instrumentId: string; label: string; payout: number }>,
    activeCandle?: SnapshotCandle | null,
  ): void => {
    marketStatusRef.current = marketStatus;
    nextMarketOpenAtRef.current = nextMarketOpenAt ? Date.parse(nextMarketOpenAt) : null;
    topAlternativesRef.current = topAlternatives ?? [];

    if (snapshotCandles.length === 0) {
      if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        logger.warn('[initializeFromSnapshot] Invalid currentPrice, skipping live candle creation:', currentPrice);
        candlesRef.current = [];
        earliestRealTimeRef.current = null;
        realStartTimesRef.current = new Set();
        liveCandleRef.current = null;
        return;
      }
      liveCandleRef.current = createLiveCandle(
        currentPrice,
        currentTime,
        currentPrice,
        currentTime
      );
      candlesRef.current = [];
      earliestRealTimeRef.current = null;
      realStartTimesRef.current = new Set();
      return;
    }

    // Normalize time: each candle occupies a fixed slot to eliminate gaps
    const closedCandles: Candle[] = [];
    const lastSnapshotCandle = snapshotCandles[snapshotCandles.length - 1];
    const anchorTime = lastSnapshotCandle.endTime;
    const firstNormalizedTime = anchorTime - (snapshotCandles.length * timeframeMs);
    
    for (let i = 0; i < snapshotCandles.length; i++) {
      const snapshotCandle = snapshotCandles[i];
      
      if (!Number.isFinite(snapshotCandle.close) || snapshotCandle.close <= 0) {
        logger.warn('[initializeFromSnapshot] Skipping invalid candle:', snapshotCandle);
        continue;
      }
      
      const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
      const normalizedEndTime = normalizedStartTime + timeframeMs;
      
      try {
        const normalizedCandle = normalizeCandle({
          ...snapshotCandle,
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          isClosed: true,
        });
        
        closedCandles.push(normalizedCandle);
      } catch (error) {
        logger.error('[initializeFromSnapshot] Failed to normalize candle:', error, snapshotCandle);
      }
    }

    // Enforce invariant: open[n] === close[n-1]
    for (let i = 1; i < closedCandles.length; i++) {
      const prev = closedCandles[i - 1];
      const curr = closedCandles[i];
      if (curr.open !== prev.close) {
        closedCandles[i] = normalizeCandle({
          ...curr,
          open: prev.close,
        });
      }
    }

    candlesRef.current = closedCandles.length > MAX_CANDLES
      ? closedCandles.slice(closedCandles.length - MAX_CANDLES)
      : closedCandles;

    // Store real timestamps for API pagination and dedup
    const firstValid = snapshotCandles.find(c => c.startTime > 0);
    earliestRealTimeRef.current = firstValid ? firstValid.startTime : snapshotCandles[0].startTime;
    realStartTimesRef.current = new Set(snapshotCandles.map((c) => c.startTime));

    if (closedCandles.length > 0) {
      const lastCandle = closedCandles[closedCandles.length - 1];
      const lastClose = lastCandle.close;
      if (!Number.isFinite(lastClose) || lastClose <= 0) {
        logger.warn('[useChartData] Invalid lastCandle.close, using currentPrice:', lastClose);
        if (currentPrice && Number.isFinite(currentPrice) && currentPrice > 0) {
          liveCandleRef.current = createLiveCandle(
            currentPrice,
            lastCandle.endTime,
            currentPrice,
            currentTime
          );
        } else {
          liveCandleRef.current = null;
        }
      } else if (activeCandle && Number.isFinite(activeCandle.high) && activeCandle.high > 0) {
        const priceToUse = currentPrice && Number.isFinite(currentPrice) && currentPrice > 0
          ? currentPrice
          : activeCandle.close;
        liveCandleRef.current = normalizeCandle({
          open: lastClose,
          high: Math.max(activeCandle.high, lastClose, priceToUse),
          low: Math.min(activeCandle.low, lastClose, priceToUse),
          close: priceToUse,
          startTime: lastCandle.endTime,
          endTime: currentTime,
          isClosed: false,
        });
      } else {
        const priceToUse = currentPrice && Number.isFinite(currentPrice) && currentPrice > 0 
          ? currentPrice 
          : lastClose;
        liveCandleRef.current = createLiveCandle(
          lastClose,
          lastCandle.endTime,
          priceToUse,
          currentTime
        );
      }
    } else {
      if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        logger.warn('[useChartData] Cannot create live candle: invalid currentPrice', currentPrice);
        liveCandleRef.current = null;
      } else {
        liveCandleRef.current = createLiveCandle(
          currentPrice,
          currentTime,
          currentPrice,
          currentTime
        );
      }
    }

    initializedRef.current = true;
    // Skip onDataChange - full viewport recalc happens in useChart after init
  };

  const handlePriceUpdate = (price: number, timestamp: number): void => {
    if (!initializedRef.current) return;
    if (!Number.isFinite(price) || price <= 0) {
      logger.warn('[useChartData] Invalid price received:', price);
      return;
    }

    if (!liveCandleRef.current) {
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      const previousClose = lastCandle?.close ?? price;
      
      if (!Number.isFinite(previousClose) || previousClose <= 0) {
        logger.warn('[useChartData] Cannot create live candle: invalid previousClose', previousClose);
        return;
      }
      
      const previousEndTime = lastCandle?.endTime ?? timestamp;

      liveCandleRef.current = createLiveCandle(
        previousClose,
        previousEndTime,
        price,
        timestamp
      );
      onDataChange?.();
      return;
    }

    const liveCandle = liveCandleRef.current;
    if (liveCandle.isClosed) {
      logger.warn('Attempted to update closed live candle');
      return;
    }

    // Fix invalid open from last historical candle
    if (liveCandle.open <= 0 || !Number.isFinite(liveCandle.open)) {
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      if (lastCandle && Number.isFinite(lastCandle.close) && lastCandle.close > 0) {
        liveCandle.open = lastCandle.close;
        liveCandle.high = Math.max(lastCandle.close, liveCandle.close);
        liveCandle.low = Math.min(lastCandle.close, liveCandle.close);
      } else {
        liveCandle.open = price;
        liveCandle.high = price;
        liveCandle.low = price;
      }
    }

    liveCandleRef.current = normalizeCandle({
      ...liveCandle,
      high: Math.max(liveCandle.high, price),
      low: Math.min(liveCandle.low, price),
      close: price,
      endTime: timestamp,
    });

    onDataChange?.();
  };

  const handleCandleClose = (
    closedCandle: SnapshotCandle,
    nextCandleStartTime: number,
    actualTimeframeMs?: number
  ): void => {
    if (!initializedRef.current) return;
    const tfMs = actualTimeframeMs ?? defaultTimeframeMs;
    const liveCandle = liveCandleRef.current;

    if (!liveCandle) {
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      const previousClose = lastCandle?.close ?? closedCandle.close;

      // Нормализуем и добавляем закрытую свечу в историю (иначе она теряется)
      const normalizedStartTime = lastCandle ? lastCandle.endTime : closedCandle.startTime;
      const normalizedEndTime = normalizedStartTime + tfMs;
      const closedNormalized = normalizeCandle({
        ...closedCandle,
        open: previousClose,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        isClosed: true,
      });
      candlesRef.current = [...candlesRef.current, closedNormalized];

      if (candlesRef.current.length > MAX_CANDLES) {
        candlesRef.current = candlesRef.current.slice(candlesRef.current.length - MAX_CANDLES);
      }

      liveCandleRef.current = createLiveCandle(
        closedNormalized.close,
        normalizedEndTime,
        closedCandle.close,
        nextCandleStartTime
      );

      onDataChange?.();
      return;
    }

    const lastCandle = candlesRef.current[candlesRef.current.length - 1];
    
    // Use endTime of previous candle as startTime to guarantee no gaps
    let normalizedStartTime = liveCandle.startTime;
    if (lastCandle) {
      normalizedStartTime = lastCandle.endTime;
    }
    const normalizedEndTime = normalizedStartTime + tfMs;
    const closedLiveCandle: Candle = normalizeCandle({
      ...liveCandle,
      ...closedCandle,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      isClosed: true,
    });

    if (lastCandle && closedLiveCandle.open !== lastCandle.close) {
      closedLiveCandle.open = lastCandle.close;
      closedLiveCandle.high = Math.max(
        closedLiveCandle.high,
        Math.max(closedLiveCandle.open, closedLiveCandle.close)
      );
      closedLiveCandle.low = Math.min(
        closedLiveCandle.low,
        Math.min(closedLiveCandle.open, closedLiveCandle.close)
      );
    }

    candlesRef.current = [...candlesRef.current, normalizeCandle(closedLiveCandle)];
    if (candlesRef.current.length > MAX_CANDLES) {
      candlesRef.current = candlesRef.current.slice(candlesRef.current.length - MAX_CANDLES);
    }

    liveCandleRef.current = createLiveCandle(
      closedLiveCandle.close,
      normalizedEndTime,
      closedLiveCandle.close,
      normalizedEndTime
    );

    onDataChange?.();
  };

  /**
   * Merges a server-side active candle snapshot into the current live candle.
   * Uses max(high), min(low), and server close if no local ticks received yet.
   */
  const applyActiveCandleSnapshot = (
    snapshotCandle: { open: number; high: number; low: number; close: number; timestamp: number }
  ): void => {
    if (!initializedRef.current) return;
    const liveCandle = liveCandleRef.current;
    if (!liveCandle) {
      return;
    }

    if (!Number.isFinite(snapshotCandle.high) || snapshotCandle.high <= 0 ||
        !Number.isFinite(snapshotCandle.low) || snapshotCandle.low <= 0 ||
        !Number.isFinite(snapshotCandle.close) || snapshotCandle.close <= 0) {
      logger.warn('[applyActiveCandleSnapshot] Invalid snapshot data:', snapshotCandle);
      return;
    }

    const mergedHigh = Math.max(liveCandle.high, snapshotCandle.high);
    const mergedLow = Math.min(liveCandle.low, snapshotCandle.low);

    const liveHasNoTicks = liveCandle.open === liveCandle.close &&
                           liveCandle.open === liveCandle.high &&
                           liveCandle.open === liveCandle.low;
    const mergedClose = liveHasNoTicks ? snapshotCandle.close : liveCandle.close;

    if (mergedHigh === liveCandle.high && mergedLow === liveCandle.low && mergedClose === liveCandle.close) {
      return;
    }

    liveCandleRef.current = normalizeCandle({
      ...liveCandle,
      high: mergedHigh,
      low: mergedLow,
      close: mergedClose,
    });

    onDataChange?.();
  };

  const getCandles = (): Candle[] => {
    return candlesRef.current;
  };

  const getLiveCandle = (): Candle | null => {
    return liveCandleRef.current;
  };

  /** Prepends historical candles to the beginning of the candle array. */
  const prependCandles = (
    newCandles: SnapshotCandle[],
    timeframeMs: number
  ): void => {
    if (newCandles.length === 0) return;

    // Dedup by real startTime (API vs normalized in chart)
    const seen = realStartTimesRef.current;
    const uniqueNew = newCandles.filter((c) => {
      if (seen.has(c.startTime)) return false;
      seen.add(c.startTime);
      return true;
    });
    if (uniqueNew.length === 0) return;

    // Sort ascending by time
    uniqueNew.sort((a, b) => a.startTime - b.startTime);

    if (candlesRef.current.length === 0) {
      const lastCandle = uniqueNew[uniqueNew.length - 1];
      const anchorTime = lastCandle.endTime;
      const firstNormalizedTime = anchorTime - (uniqueNew.length * timeframeMs);
      
      const normalizedCandles: Candle[] = [];
      for (let i = 0; i < uniqueNew.length; i++) {
        const snapshotCandle = uniqueNew[i];
        const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
        const normalizedEndTime = normalizedStartTime + timeframeMs;
        
        normalizedCandles.push(normalizeCandle({
          ...snapshotCandle,
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          isClosed: true,
        }));
      }
      
      candlesRef.current = normalizedCandles;
      earliestRealTimeRef.current = uniqueNew[0].startTime;
      onDataChange?.();
      return;
    }

    // Normalize new candles relative to existing ones
    const normalizedNewCandles: Candle[] = [];
    const firstExistingCandle = candlesRef.current[0];
    const anchorTime = firstExistingCandle.startTime;
    const firstNormalizedTime = anchorTime - (uniqueNew.length * timeframeMs);
    
    for (let i = 0; i < uniqueNew.length; i++) {
      const snapshotCandle = uniqueNew[i];
      const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
      const normalizedEndTime = normalizedStartTime + timeframeMs;
      
      const normalizedCandle = normalizeCandle({
        ...snapshotCandle,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        isClosed: true,
      });
      
      normalizedNewCandles.push(normalizedCandle);
    }

    const uniqueNewCandles = normalizedNewCandles;

    // Enforce invariant: open[n] === close[n-1] within new candles
    for (let i = 1; i < uniqueNewCandles.length; i++) {
      const prev = uniqueNewCandles[i - 1];
      const curr = uniqueNewCandles[i];
      if (curr.open !== prev.close) {
        uniqueNewCandles[i] = normalizeCandle({
          ...curr,
          open: prev.close,
        });
      }
    }

    // Fix invariant at the junction between new and existing candles
    if (candlesRef.current.length > 0) {
      const lastExisting = candlesRef.current[0];
      const firstNew = uniqueNewCandles[uniqueNewCandles.length - 1];
      
      if (firstNew.endTime <= lastExisting.startTime) {
        if (lastExisting.open !== firstNew.close) {
          candlesRef.current[0] = normalizeCandle({
            ...lastExisting,
            open: firstNew.close,
          });
        }
      }
    }

    candlesRef.current = [...uniqueNewCandles, ...candlesRef.current];
    const oldestNew = uniqueNew[0].startTime;
    if (earliestRealTimeRef.current === null || oldestNew < earliestRealTimeRef.current) {
      earliestRealTimeRef.current = oldestNew;
    }

    if (candlesRef.current.length > MAX_CANDLES) {
      candlesRef.current = candlesRef.current.slice(-MAX_CANDLES);
    }

    if (realStartTimesRef.current.size > MAX_REAL_START_TIMES) {
      realStartTimesRef.current = new Set(candlesRef.current.map((c) => c.startTime));
    }

    onDataChange?.();
  };

  const reset = (): void => {
    initializedRef.current = false;
    candlesRef.current = [];
    liveCandleRef.current = null;
    earliestRealTimeRef.current = null;
    realStartTimesRef.current = new Set();
    marketStatusRef.current = 'OPEN';
    nextMarketOpenAtRef.current = null;
    topAlternativesRef.current = [];
  };

  const getEarliestRealTime = (): number | null => earliestRealTimeRef.current;

  const getMarketStatus = (): MarketStatus => marketStatusRef.current;

  const getNextMarketOpenAt = (): number | null => nextMarketOpenAtRef.current;

  const getTopAlternatives = (): Array<{ instrumentId: string; label: string; payout: number }> => {
    return [...topAlternativesRef.current];
  };

  return {
    initializeFromSnapshot,
    handlePriceUpdate,
    handleCandleClose,
    applyActiveCandleSnapshot,
    prependCandles,
    reset,
    getCandles,
    getLiveCandle,
    getEarliestRealTime,
    getMarketStatus,
    getNextMarketOpenAt,
    getTopAlternatives,
    isInitialized: () => initializedRef.current,
  };
}
