'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { useAuth } from './useAuth';
import { useAccountStore } from '@/stores/account.store';
import type { ChartSnapshot } from '@/types/terminal';

type WSState = 'idle' | 'connecting' | 'ready' | 'subscribed' | 'closed';

export interface WsCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

type WsEvent =
  | { instrument?: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument?: string; type: 'candle:update'; data: { timeframe: string; candle: WsCandle } }
  | { instrument?: string; type: 'candle:close'; data: { timeframe: string; candle: WsCandle } }
  | { instrument?: string; type: 'candle:snapshot'; data: { candles: Array<{ timeframe: string; candle: WsCandle }> } }
  | { instrument?: string; type: 'chart:init'; data: ChartSnapshot }
  | { type: 'trade:open'; data: TradeOpenPayload }
  | { type: 'trade:close'; data: TradeClosePayload }
  | { type: 'trade:countdown'; data: { tradeId: string; secondsLeft: number } }
  | { type: 'server:time'; data: { timestamp: number } }
  | { type: 'account.snapshot'; data: { accountId: string; accountType?: string; type?: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt?: number } }
  | { type: 'error'; message: string }
  | { type: 'ws:ready'; sessionId: string; serverTime: number }
  | { type: 'subscribed'; instrument: string }
  | { type: 'unsubscribed'; instrument: string };

export interface TradeOpenPayload {
  id: string;
  instrument: string;
  direction: 'CALL' | 'PUT';
  amount: string;
  entryPrice: string;
  payout: string;
  payoutPercent?: number;
  status: string;
  openedAt: string;
  expiresAt: string;
}

export interface TradeClosePayload {
  id: string;
  instrument: string;
  direction: 'CALL' | 'PUT';
  amount: string;
  entryPrice: string;
  exitPrice: string | null;
  payout: string;
  pnl?: number;
  status: string;
  result: 'WIN' | 'LOSS' | 'TIE';
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
}

interface UseWebSocketParams {
  activeInstrumentRef?: React.MutableRefObject<string>;
  activeTimeframeRef?: React.MutableRefObject<string>;
  onPriceUpdate?: (price: number, timestamp: number) => void;
  onCandleClose?: (candle: WsCandle, timeframe: string) => void;
  onCandleSnapshot?: (candles: Array<{ timeframe: string; candle: WsCandle }>) => void;
  onChartInit?: (data: ChartSnapshot) => void;
  onServerTime?: (timestamp: number) => void;
  onTradeOpen?: (data: TradeOpenPayload) => void;
  onTradeClose?: (data: TradeClosePayload) => void;
  enabled?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = Infinity;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 15_000;
const PING_INTERVAL_MS = 30_000;
const INSTRUMENT_POLL_INTERVAL_MS = 50;

export function useWebSocket({ activeInstrumentRef, activeTimeframeRef, onPriceUpdate, onCandleClose, onCandleSnapshot, onChartInit, onServerTime, onTradeOpen, onTradeClose, enabled = true }: UseWebSocketParams) {
  const { isAuthenticated } = useAuth();

  const [wsState, setWsState] = useState<WSState>('idle');

  useEffect(() => {
    wsStateRef.current = wsState;
  }, [wsState]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(true);

  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onCandleCloseRef = useRef(onCandleClose);
  const onCandleSnapshotRef = useRef(onCandleSnapshot);
  const onChartInitRef = useRef(onChartInit);
  const onServerTimeRef = useRef(onServerTime);
  const onTradeOpenRef = useRef(onTradeOpen);
  const onTradeCloseRef = useRef(onTradeClose);
  const activeInstrumentRefRef = useRef(activeInstrumentRef);
  const activeTimeframeRefRef = useRef(activeTimeframeRef);
  const subscribedInstrumentRef = useRef<string | null>(null);
  const subscribedTimeframeRef = useRef<string | null>(null);
  const pendingSubscribeRef = useRef<{ instrument: string; timeframe: string | null } | null>(null);
  const wsStateRef = useRef<WSState>('idle');
  const subscribeToInstrumentRef = useRef<((instrument: string) => void) | null>(null);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
    onCandleCloseRef.current = onCandleClose;
    onCandleSnapshotRef.current = onCandleSnapshot;
    onChartInitRef.current = onChartInit;
    onServerTimeRef.current = onServerTime;
    onTradeOpenRef.current = onTradeOpen;
    onTradeCloseRef.current = onTradeClose;
    activeInstrumentRefRef.current = activeInstrumentRef;
    activeTimeframeRefRef.current = activeTimeframeRef;
  }, [onPriceUpdate, onCandleClose, onCandleSnapshot, onChartInit, onServerTime, onTradeOpen, onTradeClose, activeInstrumentRef, activeTimeframeRef]);

  const subscribeToInstrument = useCallback((instrument: string) => {
    const ws = wsRef.current;
    const currentState = wsStateRef.current;

    if (!ws || (currentState !== 'ready' && currentState !== 'subscribed')) return;

    const currentTimeframe = activeTimeframeRefRef.current?.current ?? null;
    const sameInstrument = subscribedInstrumentRef.current === instrument;
    const sameTimeframe = subscribedTimeframeRef.current === currentTimeframe;
    if (sameInstrument && sameTimeframe) return;

    const pending = pendingSubscribeRef.current;
    if (pending && pending.instrument === instrument && pending.timeframe === currentTimeframe) return;

    if (subscribedInstrumentRef.current && !sameInstrument) {
      ws.send(JSON.stringify({ type: 'unsubscribe', instrument: subscribedInstrumentRef.current }));
    }

    const subscribeMsg: Record<string, string> = { type: 'subscribe', instrument };
    if (currentTimeframe) subscribeMsg.timeframe = currentTimeframe;
    ws.send(JSON.stringify(subscribeMsg));
    pendingSubscribeRef.current = { instrument, timeframe: currentTimeframe };
  }, []);

  useEffect(() => {
    subscribeToInstrumentRef.current = subscribeToInstrument;
  }, [subscribeToInstrument]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (!enabled || !isAuthenticated) return;
    if (isConnectingRef.current) return;

    const currentState = wsStateRef.current;
    if (currentState === 'connecting' || currentState === 'ready' || currentState === 'subscribed') return;

    isConnectingRef.current = true;

    if (wsRef.current) {
      const old = wsRef.current;
      old.onclose = null;
      old.onerror = null;
      old.onmessage = null;
      old.onopen = null;
      wsRef.current = null;

      if (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CLOSING) {
        old.close(1000, 'replace');
      } else if (old.readyState === WebSocket.CONNECTING) {
        old.addEventListener('open', () => {
          try { old.close(1000, 'replace'); } catch { /* ignore */ }
        }, { once: true });
        old.addEventListener('error', () => {
          try { old.close(); } catch { /* ignore */ }
        }, { once: true });
      }
    }

    setWsState('connecting');

    const wsBase = typeof window !== 'undefined'
      ? (window.location.hostname === 'localhost' && window.location.port === '3000'
          ? 'http://localhost:3001'
          : window.location.origin)
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
    const wsUrl = wsBase.replace(/^http/, 'ws') + '/ws';

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;

        // Eagerly send subscribe without waiting for ws:ready — saves one server RTT
        const activeId = activeInstrumentRefRef.current?.current;
        if (activeId) {
          const currentTimeframe = activeTimeframeRefRef.current?.current ?? null;
          const subscribeMsg: Record<string, string> = { type: 'subscribe', instrument: activeId };
          if (currentTimeframe) subscribeMsg.timeframe = currentTimeframe;
          try {
            ws.send(JSON.stringify(subscribeMsg));
            pendingSubscribeRef.current = { instrument: activeId, timeframe: currentTimeframe };
          } catch { /* ignore */ }
        }

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        const processBinary = (buf: ArrayBuffer) => {
          if (buf.byteLength < 2) return;
          const view = new DataView(buf);
          const msgType = view.getUint8(0);
          if (msgType !== 0x01) return;
          const instrLen = view.getUint8(1);
          const expectedLen = 2 + instrLen + 16;
          if (instrLen === 0 || buf.byteLength < expectedLen) return;
          const instrBytes = new Uint8Array(buf, 2, instrLen);
          let instrument = '';
          for (let i = 0; i < instrLen; i++) instrument += String.fromCharCode(instrBytes[i]);
          const price = view.getFloat64(2 + instrLen, true);
          const timestamp = view.getFloat64(2 + instrLen + 8, true);
          if (!Number.isFinite(price) || !Number.isFinite(timestamp) || price <= 0) return;
          const activeId = activeInstrumentRefRef.current?.current;
          if (activeId != null && instrument !== activeId) return;
          onPriceUpdateRef.current?.(price, timestamp);
        };

        const processMessage = (message: WsEvent) => {
          const activeId = activeInstrumentRefRef.current?.current;

          if (message.type === 'ws:ready') {
            sessionIdRef.current = message.sessionId;
            setWsState('ready');
            if (activeId && subscribeToInstrumentRef.current) {
              // Skip if we already eagerly sent subscribe in onopen for this instrument
              const pending = pendingSubscribeRef.current;
              if (!pending || pending.instrument !== activeId) {
                subscribeToInstrumentRef.current(activeId);
              }
            }
            return;
          }

          if (message.type === 'subscribed') {
            const pending = pendingSubscribeRef.current;
            if (pending && pending.instrument === message.instrument) {
              subscribedInstrumentRef.current = pending.instrument;
              subscribedTimeframeRef.current = pending.timeframe;
              pendingSubscribeRef.current = null;
            }
            setWsState('subscribed');
            return;
          }

          if (message.type === 'unsubscribed') {
            if (message.instrument === subscribedInstrumentRef.current) {
              subscribedInstrumentRef.current = null;
              subscribedTimeframeRef.current = null;
              pendingSubscribeRef.current = null;
              setWsState('ready');
            }
            return;
          }

          // Filter events for non-active instruments
          if (
            (message.type === 'price:update' || message.type === 'candle:close' || message.type === 'candle:snapshot' || message.type === 'chart:init') &&
            activeId != null &&
            'instrument' in message &&
            message.instrument !== activeId
          ) {
            return;
          }

          if (message.type === 'price:update') {
            if ('instrument' in message && message.instrument === activeId) {
              onPriceUpdateRef.current?.(message.data.price, message.data.timestamp);
            }
            return;
          }

          if (message.type === 'candle:close') {
            if ('instrument' in message && message.instrument === activeId && message.data) {
              const activeTimeframe = activeTimeframeRefRef.current?.current;
              if (activeTimeframe && message.data.timeframe !== activeTimeframe) return;
              onCandleCloseRef.current?.(message.data.candle, message.data.timeframe);
            }
            return;
          }

          if (message.type === 'candle:snapshot') {
            if ('instrument' in message && message.instrument === activeId && message.data?.candles) {
              onCandleSnapshotRef.current?.(message.data.candles);
            }
            return;
          }

          if (message.type === 'chart:init') {
            if ('instrument' in message && message.instrument === activeId && message.data) {
              onChartInitRef.current?.(message.data as ChartSnapshot);
            }
            return;
          }

          if (message.type === 'trade:open') {
            if (message.data?.id != null) {
              const d = message.data as TradeOpenPayload & { payoutPercent?: number };
              if (d.payoutPercent != null && !d.payout) {
                d.payout = String(d.payoutPercent);
              }
              onTradeOpenRef.current?.(d);
            }
            return;
          }

          if (message.type === 'trade:close') {
            if (message.data?.id != null) onTradeCloseRef.current?.(message.data);
            return;
          }

          if (message.type === 'server:time') {
            if (message.data?.timestamp != null) onServerTimeRef.current?.(message.data.timestamp);
            return;
          }

          if (message.type === 'error' && message.message) {
            logger.warn('[WebSocket] Server error:', message.message);
            return;
          }

          if (message.type === 'account.snapshot') {
            const raw = message.data;
            const acctType = (raw.type ?? raw.accountType ?? 'DEMO').toUpperCase() as 'REAL' | 'DEMO';
            useAccountStore.getState().setSnapshot({
              accountId: raw.accountId,
              type: acctType,
              balance: raw.balance,
              currency: raw.currency,
              updatedAt: raw.updatedAt ?? Date.now(),
            });
            return;
          }
        };

        try {
          if (event.data instanceof Blob) {
            // Capture activeId now - ref may change by the time the async callback runs
            const capturedActiveId = activeInstrumentRefRef.current?.current ?? null;
            event.data.arrayBuffer().then((buf) => {
              if (buf.byteLength >= 2 && new DataView(buf).getUint8(0) === 0x01) {
                // Re-check instrument match with the captured value
                if (buf.byteLength >= 2) {
                  const view = new DataView(buf);
                  const instrLen = view.getUint8(1);
                  if (instrLen > 0 && buf.byteLength >= 2 + instrLen + 16) {
                    const instrBytes = new Uint8Array(buf, 2, instrLen);
                    let instrument = '';
                    for (let i = 0; i < instrLen; i++) instrument += String.fromCharCode(instrBytes[i]);
                    if (capturedActiveId != null && instrument !== capturedActiveId) return;
                  }
                }
                processBinary(buf);
              } else {
                try {
                  const text = new TextDecoder().decode(buf);
                  processMessage(JSON.parse(text) as WsEvent);
                } catch { /* ignore */ }
              }
            }).catch(() => {});
            return;
          }
          if (event.data instanceof ArrayBuffer) {
            processBinary(event.data);
            return;
          }
          processMessage(JSON.parse(event.data as string) as WsEvent);
        } catch (err) {
          logger.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        setWsState('closed');
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        setWsState('closed');
        wsRef.current = null;
        subscribedInstrumentRef.current = null;
        subscribedTimeframeRef.current = null;
        pendingSubscribeRef.current = null;
        sessionIdRef.current = null;

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (mountedRef.current && event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
            RECONNECT_MAX_DELAY,
          );
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      logger.error('[WebSocket] Failed to create connection:', error);
      setWsState('closed');
    }
  }, [enabled, isAuthenticated]);

  // Stable ref — lets poll and mount effects call the latest connect() without it being a dep
  const connectRef = useRef(connect);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  // Poll for instrument/timeframe changes (refs don't trigger useEffect)
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const interval = setInterval(() => {
      const currentInstrument = activeInstrumentRefRef.current?.current;
      const ws = wsRef.current;
      const currentState = wsStateRef.current;

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Don't auto-retry from poll after max attempts - wait for user action or remount
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
        if (!isConnectingRef.current && currentState !== 'connecting') {
          connectRef.current();
        }
        return;
      }
      // Connection succeeded - reset attempts counter
      if (reconnectAttemptsRef.current > 0) {
        reconnectAttemptsRef.current = 0;
      }

      if ((currentState === 'ready' || currentState === 'subscribed') && currentInstrument) {
        const currentTimeframe = activeTimeframeRefRef.current?.current ?? null;
        const instrumentChanged = subscribedInstrumentRef.current !== currentInstrument;
        const timeframeChanged = currentTimeframe !== null && subscribedTimeframeRef.current !== currentTimeframe;

        const pending = pendingSubscribeRef.current;
        const alreadyPending = pending && pending.instrument === currentInstrument && pending.timeframe === currentTimeframe;

        if ((instrumentChanged || timeframeChanged) && !alreadyPending && subscribeToInstrumentRef.current) {
          subscribeToInstrumentRef.current(currentInstrument);
        }
      }
    }, INSTRUMENT_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, isAuthenticated]); // connect removed: connectRef.current() always calls latest

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    if (enabled && isAuthenticated) connectRef.current();

    return () => {
      mountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;

        if (ws.readyState === WebSocket.OPEN) {
          if (subscribedInstrumentRef.current) {
            try { ws.send(JSON.stringify({ type: 'unsubscribe_all' })); } catch { /* ignore */ }
          }
          ws.close(1000, 'unmount');
        } else if (ws.readyState === WebSocket.CONNECTING) {
          // Wait for the connection to open before closing, avoids
          // "WebSocket is closed before the connection is established" errors
          const pending = ws;
          pending.addEventListener('open', () => {
            try { pending.close(1000, 'unmount'); } catch { /* ignore */ }
          }, { once: true });
          pending.addEventListener('error', () => {
            try { pending.close(); } catch { /* ignore */ }
          }, { once: true });
        }
        wsRef.current = null;
      }

      isConnectingRef.current = false;
      setWsState('idle');
      subscribedInstrumentRef.current = null;
      subscribedTimeframeRef.current = null;
      pendingSubscribeRef.current = null;
      sessionIdRef.current = null;
    };
  }, [enabled, isAuthenticated]); // connect removed: connectRef.current() always calls latest

  return {
    isConnected: wsState === 'subscribed' || wsState === 'ready',
    wsState,
  };
}
