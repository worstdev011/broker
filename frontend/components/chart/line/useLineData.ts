/**
 * WebSocket integration for the line chart.
 *
 * Each tick is stored as-is in the point store.  The renderer draws
 * a horizontal extension from the last tick to "now" (the live
 * segment), so no bridge points are needed — the flat section between
 * ticks is always rendered on-the-fly.
 */

import { useCallback, useRef, useEffect } from 'react';
import type { PricePoint } from './useLinePointStore';

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

  const onPriceUpdate = useCallback(
    (price: number, timestamp: number): void => {
      if (!enabledRef.current) return;

      viewport.calibrateTime(timestamp);
      pointStore.push({ time: timestamp, price });

      // Fix #4: Update startedAt on every tick so the live segment animation
      // stays in sync with the latest price arrival, preventing drift.
      const seg: LiveSegment = {
        fromTime: timestamp,
        toTime: timestamp + 500,
        fromPrice: price,
        startedAt: performance.now(),
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
