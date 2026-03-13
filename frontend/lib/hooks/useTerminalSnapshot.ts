'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/api';
import type { TerminalSnapshot } from '@/types/terminal';
import { DEFAULT_INSTRUMENT_ID } from '@/lib/instruments';

/**
 * Fetches user/account/trade data via HTTP.
 * Chart data (candles, price, market status) is delivered via WS `chart:init`.
 */
export function useTerminalSnapshot(
  instrument: string = DEFAULT_INSTRUMENT_ID,
) {
  const [data, setData] = useState<TerminalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api<TerminalSnapshot>(
      `/api/terminal/snapshot?instrument=${encodeURIComponent(instrument)}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!controller.signal.aborted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(e.message ?? 'Failed to load snapshot');
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [instrument]);

  return { data, loading, error };
}
