'use client';

import { useEffect, useRef, useState } from 'react';
import { useTerminalPriceStore } from '@/stores/terminalPrice.store';

const MIN = 0.24;
const MAX = 0.76;

/** Импульс от относительного изменения за окно (FX даёт крошечный rel — усиливаем). */
function impulseFromWindowRel(rel: number): number {
  if (!Number.isFinite(rel)) return 0;
  const t = Math.tanh(rel * 22000);
  return t * 0.055;
}

/** Накопленное «голосование» тиков вверх/вниз за окно — срабатывает даже когда start≈end. */
function impulseFromTickScore(score: number): number {
  if (!Number.isFinite(score) || score === 0) return 0;
  return Math.tanh(score * 0.2) * 0.048;
}

function nextSampleDelayMs(): number {
  return 3000 + Math.random() * 2000;
}

/**
 * Доля CALL (0..1): раз в ~3–5 с сдвиг по сумме тиков + дрейф цены за окно,
 * плавное следование в RAF (слабее тянем к 50%, чтобы полоска жила).
 */
export function useSentimentFromLivePrice(instrument: string | undefined): number {
  const [ratio, setRatio] = useState(0.5);
  const lastPriceRef = useRef<number | null>(null);
  const prevTickRef = useRef<number | null>(null);
  const windowStartRef = useRef<number | null>(null);
  const tickScoreRef = useRef(0);
  const targetRef = useRef(0.5);
  const displayRef = useRef(0.5);
  const lastEmitRef = useRef(0.5);

  const livePrice = useTerminalPriceStore((s) =>
    instrument ? s.byInstrument[instrument] ?? null : null,
  );
  const tickRev = useTerminalPriceStore((s) =>
    instrument ? s.tickRev[instrument] ?? 0 : 0,
  );

  useEffect(() => {
    lastPriceRef.current = null;
    prevTickRef.current = null;
    windowStartRef.current = null;
    tickScoreRef.current = 0;
    targetRef.current = 0.5;
    displayRef.current = 0.5;
    lastEmitRef.current = 0.5;
    setRatio(0.5);
  }, [instrument]);

  useEffect(() => {
    if (!instrument) return;
    if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) return;

    const prev = prevTickRef.current;
    prevTickRef.current = livePrice;
    lastPriceRef.current = livePrice;
    if (windowStartRef.current == null) {
      windowStartRef.current = livePrice;
    }
    if (prev != null && prev !== livePrice) {
      tickScoreRef.current += livePrice > prev ? 1 : -1;
      tickScoreRef.current = Math.max(-35, Math.min(35, tickScoreRef.current));
    }
  }, [instrument, livePrice, tickRev]);

  useEffect(() => {
    if (!instrument) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const end = lastPriceRef.current;
        const start = windowStartRef.current;

        let bump = 0;
        if (end != null && start != null && start > 0) {
          const rel = (end - start) / start;
          bump += impulseFromWindowRel(rel);
        }
        bump += impulseFromTickScore(tickScoreRef.current);
        tickScoreRef.current = Math.round(tickScoreRef.current * 0.25);

        if (Math.abs(bump) < 1e-6) {
          bump = Math.sin(Date.now() / 4000) * 0.02;
        }

        targetRef.current = Math.min(MAX, Math.max(MIN, targetRef.current + bump));

        windowStartRef.current = end != null ? end : start;
        schedule();
      }, nextSampleDelayMs());
    };

    schedule();
    return () => {
      cancelled = true;
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [instrument]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      targetRef.current += (0.5 - targetRef.current) * 0.00065;
      targetRef.current = Math.min(MAX, Math.max(MIN, targetRef.current));

      displayRef.current += (targetRef.current - displayRef.current) * 0.045;

      const d = displayRef.current;
      if (Math.abs(d - lastEmitRef.current) >= 0.001) {
        lastEmitRef.current = d;
        setRatio(d);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return ratio;
}
