import { getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import type { PriceEngineManager } from '../prices/PriceEngineManager.js';
import { logger } from '../shared/logger.js';
import type { TradeDTO } from '../domain/trades/TradeTypes.js';

let unsubscribeHandlers: Array<() => void> = [];
let serverTimeInterval: NodeJS.Timeout | null = null;

export async function bootstrapWebSocketEvents(
  manager: PriceEngineManager,
): Promise<void> {
  if (unsubscribeHandlers.length > 0) {
    logger.warn('WebSocket events already bootstrapped');
    return;
  }

  logger.info('Bootstrapping WebSocket events...');

  const wsManager = getWebSocketManager();
  const instrumentIds = manager.getInstrumentIds();

  for (const instrumentId of instrumentIds) {
    const eventBus = manager.getEventBus(instrumentId);
    if (!eventBus) continue;

    // Binary tick format: [0x01][instrLen:1][instrument:ASCII][price:Float64BE][timestamp:Float64BE]
    const instrBuf = Buffer.from(instrumentId, 'ascii');
    const headerSize = 2 + instrBuf.length;
    const tickBufSize = headerSize + 16;

    const unsubTick = eventBus.on('price_tick', (event) => {
      const tick = event.data as { price: number; timestamp: number };
      const buf = Buffer.allocUnsafe(tickBufSize);
      buf[0] = 0x01;
      buf[1] = instrBuf.length;
      instrBuf.copy(buf, 2);
      buf.writeDoubleBE(tick.price, headerSize);
      buf.writeDoubleBE(tick.timestamp, headerSize + 8);
      wsManager.broadcastRawToInstrument(instrumentId, buf);
    });
    unsubscribeHandlers.push(unsubTick);

    const unsubCandleClose = eventBus.on('candle_closed', (event) => {
      const candle = event.data as {
        open: number;
        high: number;
        low: number;
        close: number;
        timestamp: number;
        timeframe: string;
      };
      wsManager.broadcastCandleToInstrument(instrumentId, candle.timeframe, {
        instrument: instrumentId,
        type: 'candle:close',
        data: {
          timeframe: candle.timeframe,
          candle: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            timestamp: candle.timestamp,
            timeframe: candle.timeframe,
          },
        },
      });
    });
    unsubscribeHandlers.push(unsubCandleClose);
  }

  serverTimeInterval = setInterval(() => {
    wsManager.broadcast({
      type: 'server:time',
      data: { timestamp: Date.now() },
    });
  }, 1_000);

  logger.info(`WebSocket events bootstrapped (${instrumentIds.length} instruments)`);
}

export function emitTradeOpen(trade: TradeDTO, userId: string): void {
  const wsManager = getWebSocketManager();
  wsManager.sendToUser(userId, {
    type: 'trade:open',
    data: trade,
  });
}

export function emitTradeClose(
  trade: TradeDTO,
  userId: string,
  result: 'WIN' | 'LOSS' | 'TIE',
): void {
  const wsManager = getWebSocketManager();
  wsManager.sendToUser(userId, {
    type: 'trade:close',
    data: { ...trade, result },
  });
}

export function emitAccountSnapshot(
  userId: string,
  snapshot: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number },
): void {
  const wsManager = getWebSocketManager();
  wsManager.sendToUser(userId, {
    type: 'account.snapshot',
    data: snapshot,
  });
}

export async function shutdownWebSocketEvents(): Promise<void> {
  for (const unsubscribe of unsubscribeHandlers) {
    unsubscribe();
  }
  unsubscribeHandlers = [];

  if (serverTimeInterval) {
    clearInterval(serverTimeInterval);
    serverTimeInterval = null;
  }

  const wsManager = getWebSocketManager();
  wsManager.stopHeartbeat();

  logger.info('WebSocket events shut down');
}
