import type { FastifyInstance } from 'fastify';
import { WebSocketManager } from '../../shared/websocket/WebSocketManager.js';
import { WsClient } from '../../shared/websocket/WsClient.js';
import { authenticateWebSocket } from '../../infrastructure/websocket/WsAuthAdapter.js';
import { logger } from '../../shared/logger.js';
import { WS_RATE_LIMIT_MAX, WS_RATE_LIMIT_WINDOW_MS } from '../../config/constants.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { getTimeframeMs } from '../../prices/PriceTypes.js';
import type { Timeframe } from '../../prices/PriceTypes.js';
import type { ChartInitCandle } from '../../shared/websocket/WsEvents.js';
import { getInstrumentOrDefault } from '../../config/instruments.js';
import { getMarketStatus } from '../../domain/terminal/MarketStatus.js';

let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export async function registerWebSocketRoutes(app: FastifyInstance): Promise<void> {
  const manager = getWebSocketManager();

  app.get('/ws', { websocket: true }, async (socket, request) => {
    const client = new WsClient(socket);

    const userId = await authenticateWebSocket(request);
    if (!userId) {
      logger.warn('WebSocket connection rejected: authentication failed');
      client.close();
      return;
    }

    client.userId = userId;
    client.isAuthenticated = true;
    manager.register(client);

    logger.info({ userId, sessionId: client.sessionId }, 'WebSocket client connected');

    try {
      client.send({
        type: 'ws:ready',
        sessionId: client.sessionId,
        serverTime: Date.now(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to send ws:ready');
    }

    socket.on('message', (message: Buffer) => {
      try {
        const rawMessage = message.toString();
        const data = JSON.parse(rawMessage) as import('../../shared/websocket/WsEvents.js').WsClientMessage;

        if (data.type === 'ping') {
          client.send({ type: 'server:time', data: { timestamp: Date.now() } });
          return;
        }

        const now = Date.now();
        if (now - client.rateLimitWindowStart > WS_RATE_LIMIT_WINDOW_MS) {
          client.messageCount = 0;
          client.rateLimitWindowStart = now;
        }
        client.messageCount++;
        if (client.messageCount > WS_RATE_LIMIT_MAX) {
          logger.warn({ userId }, 'WebSocket rate limit exceeded');
          client.send({ type: 'error', message: 'Rate limit exceeded. Please slow down.' });
          return;
        }

        if (data.type === 'subscribe' && typeof data.instrument === 'string') {
          client.subscriptions.add(data.instrument);
          if (typeof data.timeframe === 'string') {
            client.activeTimeframe = data.timeframe;
          }

          logger.debug({ userId, instrument: data.instrument, timeframe: client.activeTimeframe }, 'Client subscribed');

          client.send({
            type: 'subscribed',
            instrument: data.instrument,
          });

          sendChartInit(client, data.instrument, client.activeTimeframe).catch((error) => {
            logger.error({ err: error, instrument: data.instrument }, 'Failed to send chart:init');
          });
          return;
        }

        if (data.type === 'unsubscribe' && typeof data.instrument === 'string') {
          client.subscriptions.delete(data.instrument);
          if (client.subscriptions.size === 0) {
            client.activeTimeframe = null;
          }

          logger.debug({ userId, instrument: data.instrument }, 'Client unsubscribed');

          client.send({
            type: 'unsubscribed',
            instrument: data.instrument,
          });
          return;
        }

        if (data.type === 'unsubscribe_all') {
          const instruments = Array.from(client.subscriptions);
          client.subscriptions.clear();
          client.activeTimeframe = null;

          logger.debug({ userId }, 'Client unsubscribed from all instruments');

          for (const instrument of instruments) {
            client.send({
              type: 'unsubscribed',
              instrument,
            });
          }
          return;
        }
      } catch (error) {
        logger.error({ err: error }, 'Failed to parse WebSocket message');
      }
    });

    socket.on('close', () => {
      logger.info({ userId, sessionId: client.sessionId }, 'WebSocket client disconnected');
      manager.unregister(client);
    });

    socket.on('error', (error: Error) => {
      logger.error({ err: error, userId }, 'WebSocket error');
      manager.unregister(client);
    });
  });

  logger.info('WebSocket routes registered');
}

async function sendChartInit(
  client: WsClient,
  instrument: string,
  timeframe: string | null,
): Promise<void> {
  const engineManager = getPriceEngineManager();
  const tf = (timeframe || '5s') as Timeframe;
  const tfMs = getTimeframeMs(tf);
  const serverTime = Date.now();

  const config = getInstrumentOrDefault(instrument);
  const marketStatus = getMarketStatus(config.source, instrument, serverTime);

  const [rawCandles, priceData] = await Promise.all([
    engineManager.getCandles(instrument, tf, 100),
    marketStatus.marketOpen ? engineManager.getCurrentPrice(instrument) : Promise.resolve(null),
  ]);

  const candles: ChartInitCandle[] = rawCandles.map((candle) => {
    const ts = typeof candle.timestamp === 'number'
      ? candle.timestamp
      : new Date(candle.timestamp).getTime();
    return {
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      startTime: ts,
      endTime: ts + tfMs,
    };
  });

  const activeCandles = engineManager.getActiveCandles(instrument);
  const rawActive = activeCandles.get(tf) ?? null;
  let activeCandle: ChartInitCandle | null = null;
  if (rawActive) {
    const ts = typeof rawActive.timestamp === 'number'
      ? rawActive.timestamp
      : new Date(rawActive.timestamp).getTime();
    activeCandle = {
      open: Number(rawActive.open),
      high: Number(rawActive.high),
      low: Number(rawActive.low),
      close: Number(rawActive.close),
      startTime: ts,
      endTime: ts + tfMs,
    };
  }
  const price = priceData
    ? { value: priceData.price, timestamp: priceData.timestamp }
    : null;

  client.send({
    instrument,
    type: 'chart:init',
    data: {
      instrument,
      timeframe: tf,
      candles,
      activeCandle,
      price,
      serverTime,
      marketOpen: marketStatus.marketOpen,
      marketStatus: marketStatus.marketStatus,
      nextMarketOpenAt: marketStatus.nextMarketOpenAt,
      topAlternatives: marketStatus.topAlternatives,
    },
  });

  logger.debug(
    { instrument, timeframe: tf, candleCount: candles.length, hasActiveCandle: !!activeCandle },
    'Sent chart:init',
  );
}
