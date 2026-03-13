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
  | { type: 'account.snapshot'; data: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number } }
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

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 2000;
const RECONNECT_MAX_DELAY = 30_000;
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
    if (!enabled || !isAuthenticated) return;
    if (isConnectingRef.current) return;

    const currentState = wsStateRef.current;
    if (currentState === 'connecting' || currentState === 'ready' || currentState === 'subscribed') return;

    isConnectingRef.current = true;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
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
          const price = view.getFloat64(2 + instrLen);
          const timestamp = view.getFloat64(2 + instrLen + 8);
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
              subscribeToInstrumentRef.current(activeId);
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
            if (message.data?.id != null) onTradeOpenRef.current?.(message.data);
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
            useAccountStore.getState().setSnapshot(message.data);
            return;
          }
        };

        try {
          if (event.data instanceof Blob) {
            // Capture activeId now — ref may change by the time the async callback runs
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

        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
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

  // Poll for instrument/timeframe changes (refs don't trigger useEffect)
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const interval = setInterval(() => {
      const currentInstrument = activeInstrumentRefRef.current?.current;
      const ws = wsRef.current;
      const currentState = wsStateRef.current;

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Don't auto-retry from poll after max attempts — wait for user action or remount
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
        if (!isConnectingRef.current && currentState !== 'connecting' && currentState !== 'closed') {
          connect();
        }
        return;
      }
      // Connection succeeded — reset attempts counter
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
  }, [enabled, isAuthenticated, connect]);

  // Connect on mount
  useEffect(() => {
    if (enabled && isAuthenticated) connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      if (wsRef.current) {
        if (subscribedInstrumentRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try { wsRef.current.send(JSON.stringify({ type: 'unsubscribe_all' })); } catch { /* ignore */ }
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsState('closed');
      subscribedInstrumentRef.current = null;
      sessionIdRef.current = null;
    };
  }, [enabled, isAuthenticated, connect]);

  return {
    isConnected: wsState === 'subscribed' || wsState === 'ready',
    wsState,
  };
}
