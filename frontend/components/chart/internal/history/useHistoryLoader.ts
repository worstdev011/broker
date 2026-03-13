import { useRef } from 'react';
import { logger } from '@/lib/logger';
import { api } from '@/lib/api/api';
import type { SnapshotCandle } from '../chart.types';
import type { Viewport } from '../viewport.types';
import type { HistoryState } from './history.types';

interface UseHistoryLoaderParams {
  getCandles: () => Array<{ startTime: number; endTime: number }>;
  getEarliestRealTime: () => number | null;
  prependCandles: (newCandles: SnapshotCandle[], timeframeMs: number) => void;
  timeframe: string; // например "5s"
  timeframeMs: number;
  asset: string;
}

interface UseHistoryLoaderReturn {
  maybeLoadMore: (viewport: Viewport) => void;
  getState: () => HistoryState;
  reset: () => void;
}

const PRELOAD_THRESHOLD_MS = 5000;
const HISTORY_LIMIT = 200;
const MAX_CANDLES = 3000;

export function useHistoryLoader({
  getCandles,
  getEarliestRealTime,
  prependCandles,
  timeframe,
  timeframeMs,
  asset,
}: UseHistoryLoaderParams): UseHistoryLoaderReturn {
  const isLoadingRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(true);
  const loadedRangesRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCallTimeRef = useRef<number>(0);

  const assetRef = useRef(asset);
  assetRef.current = asset;

  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  const getState = (): HistoryState => {
    return {
      isLoading: isLoadingRef.current,
      hasMore: hasMoreRef.current,
    };
  };

  const doLoadMore = async (viewport: Viewport): Promise<void> => {
    if (isLoadingRef.current || !hasMoreRef.current) {
      return;
    }

    const candles = getCandles();
    if (candles.length === 0) {
      return;
    }

    const toTime = getEarliestRealTime();
    if (toTime === null) {
      return;
    }

    // Find earliest normalized candle to check proximity to left viewport edge
    const earliestCandle = candles.reduce((earliest, candle) => {
      return candle.startTime < earliest.startTime ? candle : earliest;
    }, candles[0]);
    const earliestTime = earliestCandle.startTime;

    const timeToEarliest = viewport.timeStart - earliestTime;
    if (timeToEarliest > PRELOAD_THRESHOLD_MS) {
      return;
    }

    // Use ref to avoid stale closure from interaction callbacks
    const currentInstrument = assetRef.current;
    const rangeKey = `${currentInstrument}-${toTime}-${HISTORY_LIMIT}`;
    if (loadedRangesRef.current.has(rangeKey)) {
      return;
    }

    isLoadingRef.current = true;
    loadedRangesRef.current.add(rangeKey);
    if (loadedRangesRef.current.size > 500) {
      const entries = [...loadedRangesRef.current];
      loadedRangesRef.current = new Set(entries.slice(-250));
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = `/api/quotes/candles?instrument=${encodeURIComponent(currentInstrument)}&timeframe=${encodeURIComponent(timeframeRef.current)}&to=${toTime}&limit=${HISTORY_LIMIT}`;

      const response = await api<{ items: SnapshotCandle[] } | SnapshotCandle[]>(url, { signal: controller.signal });
      let items: SnapshotCandle[];
      if (Array.isArray(response)) {
        items = response;
      } else if (response && 'items' in response && Array.isArray(response.items)) {
        items = response.items;
      } else {
        items = [];
      }

      // Discard stale response if instrument changed during fetch
      if (assetRef.current !== currentInstrument) {
        isLoadingRef.current = false;
        return;
      }

      if (!items || items.length === 0) {
        hasMoreRef.current = false;
        isLoadingRef.current = false;
        return;
      }

      const sortedCandles = [...items].sort(
        (a, b) => a.startTime - b.startTime
      );

      prependCandles(sortedCandles, timeframeMs);

      // Если пришло меньше limit → больше нет данных
      if (items.length < HISTORY_LIMIT) {
        hasMoreRef.current = false;
      }

      isLoadingRef.current = false;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      logger.error('Failed to load history:', error);
      isLoadingRef.current = false;
      loadedRangesRef.current.delete(rangeKey);
    }
  };

  const THROTTLE_MS = 50;
  const maybeLoadMore = (viewport: Viewport): void => {
    const now = performance.now();
    if (now - lastCallTimeRef.current < THROTTLE_MS) return;
    lastCallTimeRef.current = now;
    doLoadMore(viewport);
  };

  const reset = (): void => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    loadedRangesRef.current = new Set();
    hasMoreRef.current = true;
    isLoadingRef.current = false;
  };

  return {
    maybeLoadMore,
    getState,
    reset,
  };
}
