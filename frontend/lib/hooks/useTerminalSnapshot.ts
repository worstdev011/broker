/**
 * useTerminalSnapshot hook - fetches terminal snapshot
 * FLOW P4: instrument = instrumentId (EURUSD_OTC, EURUSD_REAL, …), default EURUSD_OTC
 */

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/api';
import type { TerminalSnapshot } from '@/types/terminal';
import { DEFAULT_INSTRUMENT_ID } from '@/lib/instruments';

export function useTerminalSnapshot(
  instrument: string = DEFAULT_INSTRUMENT_ID,
  timeframe: string = '5s',
) {
  const [data, setData] = useState<TerminalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    api<TerminalSnapshot>(
      `/api/terminal/snapshot?instrument=${encodeURIComponent(instrument)}&timeframe=${encodeURIComponent(timeframe)}`,
    )
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message ?? 'Failed to load snapshot');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [instrument, timeframe]);

  return { data, loading, error };
}
