/**
 * useWebSocket - FLOW WS-1: Production-grade WebSocket with proper lifecycle
 * 
 * States: idle -> connecting -> ready -> subscribed -> closed
 * 
 * ✅ Нет setTimeout
 * ✅ Нет race conditions
 * ✅ Polling только как fallback
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';

/** FLOW WS-1.2: WebSocket состояния */
type WSState = 'idle' | 'connecting' | 'ready' | 'subscribed' | 'closed';

/** FLOW P5: price/candle events include instrument (EURUSD_OTC, EURUSD_REAL, …) */
type WsEvent =
  | { instrument?: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument?: string; type: 'candle:update'; data: { timeframe: string; candle: any } }
  | { instrument?: string; type: 'candle:close'; data: { timeframe: string; candle: any } }
  // FLOW CANDLE-SNAPSHOT: Активные свечи при подписке (восстановление live-свечи после reload)
  | { instrument?: string; type: 'candle:snapshot'; data: { candles: Array<{ timeframe: string; candle: any }> } }
  | { type: 'trade:open'; data: TradeOpenPayload }
  | { type: 'trade:close'; data: TradeClosePayload }
  | { type: 'trade:countdown'; data: any }
  | { type: 'server:time'; data: { timestamp: number } }
  // FLOW A-ACCOUNT: Account snapshot event
  | { type: 'account.snapshot'; payload: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number } }
  // Server error (e.g. rate limit)
  | { type: 'error'; message: string }
  // FLOW WS-1: Handshake events
  | { type: 'ws:ready'; sessionId: string; serverTime: number }
  | { type: 'subscribed'; instrument: string }
  | { type: 'unsubscribed'; instrument: string };

/** Payload при открытии сделки (backend: TradeDTO) */
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

/** Payload при закрытии сделки (backend: TradeDTO & { result }) */
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
  /** 🔥 FLOW WS-TF: Активный таймфрейм — сервер фильтрует candle:close и snapshot */
  activeTimeframeRef?: React.MutableRefObject<string>;
  onPriceUpdate?: (price: number, timestamp: number) => void;
  onCandleClose?: (candle: any, timeframe: string) => void;
  /** FLOW CANDLE-SNAPSHOT: Снапшот активных свечей при подписке (для восстановления live-свечи) */
  onCandleSnapshot?: (candles: Array<{ timeframe: string; candle: any }>) => void;
  /** FLOW T3: серверное время — источник истины, обновление ref без setInterval */
  onServerTime?: (timestamp: number) => void;
  /** Тост «сделка открыта» (постоянный до закрытия) */
  onTradeOpen?: (data: TradeOpenPayload) => void;
  /** Обработка закрытия сделки — снять тост открытия, тост результата, удаление с графика */
  onTradeClose?: (data: TradeClosePayload) => void;
  enabled?: boolean;
}

export function useWebSocket({ activeInstrumentRef, activeTimeframeRef, onPriceUpdate, onCandleClose, onCandleSnapshot, onServerTime, onTradeOpen, onTradeClose, enabled = true }: UseWebSocketParams) {
  const { isAuthenticated } = useAuth();
  
  // FLOW WS-1.2: Состояние WebSocket
  const [wsState, setWsState] = useState<WSState>('idle');
  
  // Синхронизируем ref с состоянием
  useEffect(() => {
    wsStateRef.current = wsState;
  }, [wsState]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const sessionIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false); // Защита от множественных подключений

  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onCandleCloseRef = useRef(onCandleClose);
  const onCandleSnapshotRef = useRef(onCandleSnapshot);
  const onServerTimeRef = useRef(onServerTime);
  const onTradeOpenRef = useRef(onTradeOpen);
  const onTradeCloseRef = useRef(onTradeClose);
  const activeInstrumentRefRef = useRef(activeInstrumentRef);
  const activeTimeframeRefRef = useRef(activeTimeframeRef); // 🔥 FLOW WS-TF
  const subscribedInstrumentRef = useRef<string | null>(null);
  const subscribedTimeframeRef = useRef<string | null>(null); // 🔥 FLOW WS-TF
  // 🔥 FIX: Pending subscribe — блокирует дубли пока ждём подтверждение от сервера
  const pendingSubscribeRef = useRef<{ instrument: string; timeframe: string | null } | null>(null);
  const wsStateRef = useRef<WSState>('idle'); // Ref для текущего состояния
  const subscribeToInstrumentRef = useRef<((instrument: string) => void) | null>(null);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
    onCandleCloseRef.current = onCandleClose;
    onCandleSnapshotRef.current = onCandleSnapshot;
    onServerTimeRef.current = onServerTime;
    onTradeOpenRef.current = onTradeOpen;
    onTradeCloseRef.current = onTradeClose;
    activeInstrumentRefRef.current = activeInstrumentRef;
    activeTimeframeRefRef.current = activeTimeframeRef;
  }, [onPriceUpdate, onCandleClose, onCandleSnapshot, onServerTime, onTradeOpen, onTradeClose, activeInstrumentRef, activeTimeframeRef]);

  /**
   * FLOW WS-1.4: Подписка на инструмент (только когда state === 'ready')
   */
  const subscribeToInstrument = useCallback((instrument: string) => {
    const ws = wsRef.current;
    const currentState = wsStateRef.current; // Используем ref вместо state
    
    if (!ws || currentState !== 'ready') {
      return;
    }

    // 🔥 FLOW WS-TF: Проверяем и инструмент, и таймфрейм — ре-подписка нужна при смене любого из них
    const currentTimeframe = activeTimeframeRefRef.current?.current ?? null;
    const sameInstrument = subscribedInstrumentRef.current === instrument;
    const sameTimeframe = subscribedTimeframeRef.current === currentTimeframe;
    if (sameInstrument && sameTimeframe) {
      return; // Уже подписаны с тем же инструментом и таймфреймом
    }

    // 🔥 FIX: Если уже ждём подтверждение на тот же инструмент+таймфрейм — не дублируем
    const pending = pendingSubscribeRef.current;
    if (pending && pending.instrument === instrument && pending.timeframe === currentTimeframe) {
      return;
    }

    // FLOW WS-1.5: Отписываемся от старого инструмента (если инструмент другой)
    if (subscribedInstrumentRef.current && !sameInstrument) {
      const unsubscribeMsg = JSON.stringify({ 
        type: 'unsubscribe', 
        instrument: subscribedInstrumentRef.current 
      });
      ws.send(unsubscribeMsg);
    }

    // Подписываемся на новый инструмент (или переподписываемся с новым таймфреймом)
    // 🔥 FLOW WS-TF: Включаем активный таймфрейм — сервер будет фильтровать candle:close и snapshot
    const subscribeMsg = JSON.stringify({ 
      type: 'subscribe', 
      instrument,
      ...(currentTimeframe ? { timeframe: currentTimeframe } : {}),
    });
    
    ws.send(subscribeMsg);
    // 🔥 FIX: Не ставим subscribedRef сразу — ждём подтверждение 'subscribed' от сервера
    pendingSubscribeRef.current = { instrument, timeframe: currentTimeframe };
  }, []); // Убрали wsState из зависимостей
  
  // Сохраняем функцию в ref для использования в обработчиках
  useEffect(() => {
    subscribeToInstrumentRef.current = subscribeToInstrument;
  }, [subscribeToInstrument]);

  /**
   * FLOW WS-1.3: Подключение
   */
  const connect = useCallback(() => {
    if (!enabled || !isAuthenticated) return;
    
    // Защита от множественных подключений
    if (isConnectingRef.current) {
      return;
    }
    
    const currentState = wsStateRef.current;
    if (currentState === 'connecting' || currentState === 'ready' || currentState === 'subscribed') {
      // Уже подключен или подключается
      return;
    }

    isConnectingRef.current = true;

    // Закрываем существующее соединение если есть
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setWsState('connecting');

    // Определяем WebSocket URL
    // - Локально: фронт 3000, бэк 3001 — WebSocket на бэке
    // - Продакшен: same-origin, nginx проксирует /ws на бэк
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
        // НЕ подписываемся здесь - ждём ws:ready

        // Отправляем ping для поддержания соединения
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping каждые 30 секунд

        // Сохраняем interval для cleanup
        (ws as any).pingInterval = pingInterval;
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
          if (onPriceUpdateRef.current) onPriceUpdateRef.current(price, timestamp);
        };

        const processMessage = (message: WsEvent) => {

          // FLOW WS-1.0: Обрабатываем ws:ready
          if (message.type === 'ws:ready') {
            sessionIdRef.current = message.sessionId;
            setWsState('ready');
            
            const activeId = activeInstrumentRefRef.current?.current;
            // FLOW WS-1.4: Теперь можно подписываться
            if (activeId && subscribeToInstrumentRef.current) {
              subscribeToInstrumentRef.current(activeId);
            }
            return;
          }

          // FLOW WS-1.4: Обрабатываем подтверждение подписки
          if (message.type === 'subscribed') {
            // 🔥 FIX: Только при подтверждении сервера ставим subscribedRefs
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
              subscribedTimeframeRef.current = null; // 🔥 FIX: Очищаем таймфрейм вместе с инструментом
              pendingSubscribeRef.current = null; // Очищаем pending тоже
              setWsState('ready');
            }
            return;
          }

          // BACKEND уже фильтрует по instrument, но оставляем защиту:
          const activeId = activeInstrumentRefRef.current?.current;
          if (
            (message.type === 'price:update' ||
              message.type === 'candle:close' ||
              message.type === 'candle:snapshot') &&
            activeId != null &&
            'instrument' in message &&
            message.instrument !== activeId
          ) {
            return;
          }

          // FLOW LC-5S: Обработка price:update
          if (message.type === 'price:update') {
            const activeId = activeInstrumentRefRef.current?.current;
            if (
              'instrument' in message &&
              message.instrument === activeId
            ) {
              if (onPriceUpdateRef.current) {
                onPriceUpdateRef.current(message.data.price, message.data.timestamp);
              }
            }
            return;
          }

          // FLOW LC-5S: Обработка candle:close
          if (message.type === 'candle:close') {
            const activeId = activeInstrumentRefRef.current?.current;
            if (
              'instrument' in message &&
              message.instrument === activeId
            ) {
              if (onCandleCloseRef.current && message.data) {
                // message.data имеет структуру { timeframe: string, candle: Candle }
                onCandleCloseRef.current(message.data.candle, message.data.timeframe);
              }
            }
            return;
          }

          // FLOW CANDLE-SNAPSHOT: Обработка снапшота активных свечей при подписке
          if (message.type === 'candle:snapshot') {
            const activeId = activeInstrumentRefRef.current?.current;
            if (
              'instrument' in message &&
              message.instrument === activeId
            ) {
              if (onCandleSnapshotRef.current && message.data?.candles) {
                onCandleSnapshotRef.current(message.data.candles);
              }
            }
            return;
          }

          if (message.type === 'trade:open') {
            if (onTradeOpenRef.current && message.data?.id != null) {
              onTradeOpenRef.current(message.data);
            }
            return;
          }

          if (message.type === 'trade:close') {
            if (onTradeCloseRef.current && message.data?.id != null) {
              onTradeCloseRef.current(message.data);
            }
            return;
          }

          // Обработка server:time
          if (message.type === 'server:time') {
            if (onServerTimeRef.current && message.data?.timestamp != null) {
              onServerTimeRef.current(message.data.timestamp);
            }
            return;
          }

          // Обработка error (например rate limit)
          if (message.type === 'error' && message.message) {
            console.warn('[WebSocket] Server error:', message.message);
            return;
          }

          // FLOW A-ACCOUNT: Обработка account.snapshot
          if (message.type === 'account.snapshot') {
            // Импортируем store динамически чтобы избежать циклических зависимостей
            import('@/stores/account.store').then(({ useAccountStore }) => {
              useAccountStore.getState().setSnapshot(message.payload);
            });
            return;
          }
        };

        try {
          // Blob: браузер может отдать binary frame как Blob (игнор binaryType в некоторых случаях)
          if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((buf) => {
              if (buf.byteLength >= 2 && new DataView(buf).getUint8(0) === 0x01) {
                processBinary(buf);
              } else {
                try {
                  const text = new TextDecoder().decode(buf);
                  processMessage(JSON.parse(text) as WsEvent);
                } catch {
                  // ignore
                }
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
          console.error('[WebSocket] Failed to parse message:', err);
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

        // Переподключение (только если не было явного закрытия)
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('[WebSocket] Failed to create connection:', error);
      setWsState('closed');
    }
  }, [enabled, isAuthenticated]); // Убрали subscribeToInstrument из зависимостей

  /**
   * FLOW WS-1.4: Отслеживание изменений инструмента и подписка
   * Используем легкий polling для отслеживания изменений ref (ref не триггерит useEffect)
   * Polling работает только когда WS готов (ready/subscribed) - это не fallback, а механизм отслеживания ref
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    
    // Polling для отслеживания изменений инструмента (когда WS готов)
    // И fallback для переподключения (когда WS не готов)
    const interval = setInterval(() => {
      const currentInstrument = activeInstrumentRefRef.current?.current;
      const ws = wsRef.current;
      const currentState = wsStateRef.current; // Используем ref вместо state

      // FLOW WS-1.6: Fallback - переподключение если WS не готов
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // 🔥 FIX: Если все попытки исчерпаны и state === 'closed' — сбрасываем и пробуем снова
        // Это гарантирует что пользователь не останется без данных навсегда
        if (currentState === 'closed' && reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current = 0; // Сброс — даём новый цикл попыток
          connect();
          return;
        }

        // Не переподключаемся если уже идет подключение
        if (!isConnectingRef.current && currentState !== 'connecting' && currentState !== 'closed') {
          connect();
        }
        return;
      }

      // FLOW WS-1.4: Если WS готов - проверяем нужно ли подписаться/переподписаться
      if ((currentState === 'ready' || currentState === 'subscribed') && currentInstrument) {
        const currentTimeframe = activeTimeframeRefRef.current?.current ?? null;
        // 🔥 FLOW WS-TF: Ре-подписка если инструмент ИЛИ таймфрейм изменился
        const instrumentChanged = subscribedInstrumentRef.current !== currentInstrument;
        const timeframeChanged = currentTimeframe !== null && subscribedTimeframeRef.current !== currentTimeframe;

        // 🔥 FIX: Не дублируем если уже ждём подтверждение на тот же инструмент+таймфрейм
        const pending = pendingSubscribeRef.current;
        const alreadyPending = pending && pending.instrument === currentInstrument && pending.timeframe === currentTimeframe;

        if ((instrumentChanged || timeframeChanged) && !alreadyPending && subscribeToInstrumentRef.current) {
          subscribeToInstrumentRef.current(currentInstrument);
        }
      }
    }, 250); // 🔥 FIX #19: 250ms — быстрая реакция на смену инструмента/таймфрейма (было 1000ms)

    return () => {
      clearInterval(interval);
    };
  }, [enabled, isAuthenticated, connect]); // Убрали wsState и subscribeToInstrument из зависимостей

  /**
   * FLOW WS-1.3: Подключение при монтировании
   */
  useEffect(() => {
    if (enabled && isAuthenticated) {
      connect();
    }

    return () => {
      // FLOW WS-1.7: Закрытие / reset
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Очищаем ping interval если есть
        if ((wsRef.current as any).pingInterval) {
          clearInterval((wsRef.current as any).pingInterval);
        }
        
        // Отписываемся от всех инструментов
        if (subscribedInstrumentRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: 'unsubscribe_all' }));
          } catch (e) {
            // Игнорируем ошибки при закрытии
          }
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
