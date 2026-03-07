/**
 * useHistoryLoader - ядро FLOW G6
 * 
 * Ответственность:
 * - Загрузка истории свечей при pan влево
 * - Защита от дубликатов
 * - Управление состоянием загрузки
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - render
 * - interactions
 * - viewport-логика
 * - изменение live-свечи
 * - useState
 */

import { useRef } from 'react';
import { api } from '@/lib/api/api';
import type { SnapshotCandle } from '../chart.types';
import type { Viewport } from '../viewport.types';
import type { HistoryState } from './history.types';

interface UseHistoryLoaderParams {
  getCandles: () => Array<{ startTime: number; endTime: number }>; // Только для чтения startTime/endTime (normalized)
  getEarliestRealTime: () => number | null; // Реальный timestamp самой ранней свечи (БД) — для API ?to=
  prependCandles: (newCandles: SnapshotCandle[], timeframeMs: number) => void;
  timeframe: string; // например "5s"
  timeframeMs: number;
  asset: string;
}

interface UseHistoryLoaderReturn {
  maybeLoadMore: (viewport: Viewport) => void;
  getState: () => HistoryState;
  reset: () => void; // FLOW T1: сброс при смене timeframe (очистка loadedRanges, hasMore)
}

const PRELOAD_THRESHOLD_MS = 5000; // Загружаем за 5 секунд до границы (примерно 1 свеча для 5s timeframe)
const HISTORY_LIMIT = 200; // Количество свечей за запрос
const MAX_CANDLES = 3000; // Максимальное количество свечей в памяти

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
  // 🔥 FIX: AbortController — отмена in-flight запросов при reset/смене таймфрейма
  const abortControllerRef = useRef<AbortController | null>(null);
  // Минимальный throttle — не чаще 1 вызова в 50ms (смягчает спайки при быстром pan)
  const lastCallTimeRef = useRef<number>(0);

  /** FLOW P: всегда брать текущий инструмент при запросе — колбэк pan может быть из старого рендера */
  const assetRef = useRef(asset);
  assetRef.current = asset;

  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  /**
   * Получить текущее состояние
   */
  const getState = (): HistoryState => {
    return {
      isLoading: isLoadingRef.current,
      hasMore: hasMoreRef.current,
    };
  };

  /**
   * Внутренняя реализация загрузки истории
   */
  const doLoadMore = async (viewport: Viewport): Promise<void> => {
    // Если уже загружается или нет больше данных
    if (isLoadingRef.current || !hasMoreRef.current) {
      return;
    }

    const candles = getCandles();
    if (candles.length === 0) {
      return;
    }

    // Реальный timestamp самой ранней свечи (БД) — API использует реальные timestamps
    const toTime = getEarliestRealTime();
    if (toTime === null) {
      return;
    }

    // Находим самую раннюю свечу (normalized) для проверки «близко к левой границе»
    const earliestCandle = candles.reduce((earliest, candle) => {
      return candle.startTime < earliest.startTime ? candle : earliest;
    }, candles[0]);
    const earliestTime = earliestCandle.startTime;

    // Загружаем, если viewport.timeStart близко к earliestTime (normalized)
    const timeToEarliest = viewport.timeStart - earliestTime;
    if (timeToEarliest > PRELOAD_THRESHOLD_MS) {
      return; // Еще рано загружать
    }

    // FLOW P: instrument из ref — колбэк pan/zoom в useChartInteractions с deps [] даёт stale closure
    const currentInstrument = assetRef.current;
    const rangeKey = `${currentInstrument}-${toTime}-${HISTORY_LIMIT}`;
    if (loadedRangesRef.current.has(rangeKey)) {
      return;
    }

    isLoadingRef.current = true;
    loadedRangesRef.current.add(rangeKey);

    // 🔥 FIX: Отменяем предыдущий in-flight запрос и создаём новый AbortController
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = `/api/quotes/candles?instrument=${encodeURIComponent(currentInstrument)}&timeframe=${encodeURIComponent(timeframeRef.current)}&to=${toTime}&limit=${HISTORY_LIMIT}`;

      // Формат ответа: { items: SnapshotCandle[] } или SnapshotCandle[]
      const response = await api<{ items: SnapshotCandle[] } | SnapshotCandle[]>(url, { signal: controller.signal });
      
      // Нормализуем формат ответа
      let items: SnapshotCandle[];
      if (Array.isArray(response)) {
        items = response;
      } else if (response && 'items' in response && Array.isArray(response.items)) {
        items = response.items;
      } else {
        items = [];
      }

      if (!items || items.length === 0) {
        // Нет больше данных
        hasMoreRef.current = false;
        isLoadingRef.current = false;
        return;
      }

      // Сортируем по времени (от старых к новым)
      const sortedCandles = [...items].sort(
        (a, b) => a.startTime - b.startTime
      );

      // Дедуп по startTime выполняется в useChartData.prependCandles (realStartTimesRef)
      // Prepend в data layer
      prependCandles(sortedCandles, timeframeMs);

      // Если пришло меньше limit → больше нет данных
      if (items.length < HISTORY_LIMIT) {
        hasMoreRef.current = false;
      }

      isLoadingRef.current = false;
    } catch (error) {
      // 🔥 FIX: Игнорируем отменённые запросы (AbortController)
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to load history:', error);
      isLoadingRef.current = false;
      // 🔥 FIX: Удаляем rangeKey при ошибке — иначе повторная загрузка заблокирована навсегда
      loadedRangesRef.current.delete(rangeKey);
      // Не помечаем hasMore = false, чтобы можно было повторить
    }
  };

  const THROTTLE_MS = 50; // Капелька задержки — не чаще 1 вызова в 50ms
  const maybeLoadMore = (viewport: Viewport): void => {
    const now = performance.now();
    if (now - lastCallTimeRef.current < THROTTLE_MS) return;
    lastCallTimeRef.current = now;
    doLoadMore(viewport);
  };

  const reset = (): void => {
    // 🔥 FIX: Отменяем in-flight HTTP запрос при reset (смена таймфрейма/инструмента)
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
