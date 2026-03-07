/**
 * WebSocket Integration для линейного графика
 *
 * Каждый тик записывается как точка (tick-level, как Pocket Option).
 * Live сегмент — продолжение линии от последнего тика к текущему моменту.
 */

import { useCallback, useRef, useEffect } from 'react';
import type { PricePoint } from './useLinePointStore';

/**
 * Live сегмент — плоское продолжение от последнего тика до «сейчас».
 * X = wallNow (вычисляется в render loop), Y = последний тик (snap).
 */
export type LiveSegment = {
  fromTime: number;
  toTime: number;
  fromPrice: number;
  startedAt: number;
} | null;

interface UseLineDataParams {
  pointStore: {
    push: (point: PricePoint) => void;
    getLast: () => PricePoint | null;
    getAll: () => PricePoint[];
  };
  viewport: {
    calibrateTime: (serverTimestamp: number) => void;
  };
  enabled?: boolean;
  setLiveSegment?: (segment: LiveSegment) => void;
}

export function useLineData({ pointStore, viewport, enabled = true, setLiveSegment }: UseLineDataParams) {
  const enabledRef = useRef(enabled);
  const liveSegmentRef = useRef<LiveSegment>(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * Каждый тик → точка в store + live сегмент обновляется.
   */
  const onPriceUpdate = useCallback(
    (price: number, timestamp: number): void => {
      if (!enabledRef.current) return;

      pointStore.push({ time: timestamp, price });
      viewport.calibrateTime(timestamp);

      const seg: LiveSegment = {
        fromTime: timestamp,
        toTime: timestamp + 500,
        fromPrice: price,
        startedAt: liveSegmentRef.current?.startedAt ?? performance.now(),
      };
      liveSegmentRef.current = seg;
      setLiveSegment?.(seg);
    },
    [pointStore, viewport, setLiveSegment]
  );

  return {
    onPriceUpdate,
  };
}
