/**
 * Reduced points for the line chart (Pocket Option approach).
 *
 * Raw ticks are grouped into 1-second buckets. Each bucket stores
 * the last (close) price. The current (pending) bucket is always
 * the last element of the array and is updated in-place on every
 * tick — there is no separate "live point" concept. This guarantees
 * a single source of truth: what you see on screen never changes
 * retroactively when a bucket closes.
 */

import { useRef, useCallback } from 'react';
import type { PricePoint } from './useLinePointStore';

const INTERVAL_MS = 1000;

export function useLineReducedPoints() {
  const reducedRef = useRef<PricePoint[]>([]);
  const currentBucketEndRef = useRef<number>(0);

  function bucketEndFor(time: number): number {
    return Math.floor(time / INTERVAL_MS) * INTERVAL_MS + INTERVAL_MS;
  }

  const pushTick = useCallback((tick: PricePoint) => {
    const be = bucketEndFor(tick.time);
    const arr = reducedRef.current;

    if (be === currentBucketEndRef.current && arr.length > 0) {
      // Same bucket — update last element in place
      arr[arr.length - 1].price = tick.price;
      return;
    }

    // New bucket — fill any gaps, then append
    if (currentBucketEndRef.current > 0 && arr.length > 0) {
      const prevPrice = arr[arr.length - 1].price;
      for (let t = currentBucketEndRef.current + INTERVAL_MS; t < be; t += INTERVAL_MS) {
        arr.push({ time: t, price: prevPrice });
      }
    }

    arr.push({ time: be, price: tick.price });
    currentBucketEndRef.current = be;
  }, []);

  const buildFromRaw = useCallback((raw: PricePoint[]) => {
    reducedRef.current = [];
    currentBucketEndRef.current = 0;
    for (let i = 0; i < raw.length; i++) {
      pushTick(raw[i]);
    }
  }, [pushTick]);

  const getReducedPoints = useCallback((): PricePoint[] => {
    return reducedRef.current;
  }, []);

  const reset = useCallback(() => {
    reducedRef.current = [];
    currentBucketEndRef.current = 0;
  }, []);

  const prependReduced = useCallback((points: PricePoint[]) => {
    if (points.length === 0) return;

    const reduced: PricePoint[] = [];
    let prevBe = 0;

    for (let i = 0; i < points.length; i++) {
      const tick = points[i];
      const be = bucketEndFor(tick.time);

      if (be === prevBe && reduced.length > 0) {
        reduced[reduced.length - 1].price = tick.price;
        continue;
      }

      if (prevBe > 0 && reduced.length > 0) {
        const prevPrice = reduced[reduced.length - 1].price;
        for (let t = prevBe + INTERVAL_MS; t < be; t += INTERVAL_MS) {
          reduced.push({ time: t, price: prevPrice });
        }
      }

      reduced.push({ time: be, price: tick.price });
      prevBe = be;
    }

    if (reduced.length === 0) return;

    const existing = reducedRef.current;
    if (existing.length === 0) {
      reducedRef.current = reduced;
      return;
    }

    const earliestExisting = existing[0].time;
    const filtered = reduced.filter(p => p.time < earliestExisting);
    if (filtered.length > 0) {
      reducedRef.current = [...filtered, ...existing];
    }
  }, []);

  return {
    pushTick,
    buildFromRaw,
    getReducedPoints,
    prependReduced,
    reset,
  };
}
