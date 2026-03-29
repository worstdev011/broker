import type { PriceEngineManager } from "../prices/PriceEngineManager.js";
import type { CandleAggregator, CandleCloseEvent } from "../prices/CandleAggregator.js";
import type { PriceTick } from "../prices/engines/OtcPriceEngine.js";
import { wsManager } from "../websocket/ws.manager.js";
import { logger } from "../shared/logger.js";

let serverTimeInterval: ReturnType<typeof setInterval> | null = null;

function encodePriceUpdate(instrument: string, price: number, timestamp: number): Buffer {
  const nameLen = instrument.length;
  const buf = Buffer.alloc(2 + nameLen + 16);
  buf[0] = 0x01;
  buf[1] = nameLen;
  buf.write(instrument, 2, nameLen, "ascii");
  buf.writeDoubleLE(price, 2 + nameLen);
  buf.writeDoubleLE(timestamp, 2 + nameLen + 8);
  return buf;
}

export function bootstrapWebSocketEvents(
  manager: PriceEngineManager,
  aggregator: CandleAggregator,
): void {
  manager.on("price:tick", (tick: PriceTick) => {
    wsManager.broadcastRawToInstrument(
      tick.instrumentId,
      encodePriceUpdate(tick.instrumentId, tick.price, tick.timestamp),
    );

    wsManager.broadcastToInstrument(tick.instrumentId, {
      type: "price:update",
      instrument: tick.instrumentId,
      data: {
        asset: tick.instrumentId,
        price: tick.price,
        timestamp: tick.timestamp,
      },
    });
  });

  aggregator.on("candle:close", (event: CandleCloseEvent) => {
    wsManager.broadcastToInstrumentTimeframe(event.instrumentId, event.timeframe, {
      type: "candle:close",
      instrument: event.instrumentId,
      data: {
        timeframe: event.timeframe,
        candle: event.candle,
      },
    });
  });

  serverTimeInterval = setInterval(() => {
    wsManager.broadcastAll({ type: "server:time", data: { timestamp: Date.now() } });
  }, 1000);

  logger.info("WebSocket event bridge started");
}

export function shutdownWebSocketEvents(): void {
  if (serverTimeInterval) {
    clearInterval(serverTimeInterval);
    serverTimeInterval = null;
  }
}
