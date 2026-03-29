import type { WebSocket } from "ws";
import { wsManager } from "./ws.manager.js";
import { priceProvider } from "../prices/PriceProvider.js";
import { isMarketOpen } from "../domain/instruments/instrument.service.js";
import { instrumentRepository } from "../infrastructure/prisma/instrument.repository.js";
import { logger } from "../shared/logger.js";

const DEFAULT_TIMEFRAME = "1m";
const VALID_TIMEFRAMES = new Set([
  "5s", "10s", "15s", "30s",
  "1m", "2m", "3m", "5m", "10m", "15m", "30m",
  "1h", "4h", "1d",
]);
const INSTRUMENT_ID_RE = /^[a-zA-Z0-9_.\-/]{1,50}$/;

export async function handleWsMessage(
  ws: WebSocket,
  raw: string,
): Promise<void> {
  let msg: { type: string; instrument?: string; timeframe?: string };

  try {
    msg = JSON.parse(raw);
  } catch {
    sendError(ws, "PARSE_ERROR", "Invalid JSON");
    return;
  }

  if (!msg || typeof msg.type !== "string") {
    sendError(ws, "INVALID_MESSAGE", "Missing message type");
    return;
  }

  try {
    switch (msg.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;

      case "subscribe":
        await handleSubscribe(ws, msg.instrument, msg.timeframe);
        break;

      case "unsubscribe":
        if (msg.instrument) wsManager.removeSubscription(ws, msg.instrument);
        break;

      case "unsubscribe_all":
        wsManager.removeAllSubscriptions(ws);
        break;

      default:
        sendError(ws, "UNKNOWN_TYPE", `Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    logger.warn({ err: error, type: msg.type }, "Error processing WS message");
    sendError(ws, "INTERNAL_ERROR", "Failed to process message");
  }
}

async function handleSubscribe(
  ws: WebSocket,
  instrumentId: string | undefined,
  timeframe: string | undefined,
): Promise<void> {
  if (!instrumentId) {
    sendError(ws, "INVALID_PARAMS", "Missing instrument");
    return;
  }

  if (!INSTRUMENT_ID_RE.test(instrumentId)) {
    sendError(ws, "INVALID_PARAMS", "Invalid instrument id format");
    return;
  }

  const tf = timeframe || DEFAULT_TIMEFRAME;

  if (!VALID_TIMEFRAMES.has(tf)) {
    sendError(ws, "INVALID_PARAMS", `Invalid timeframe: ${tf}`);
    return;
  }

  const inst = await instrumentRepository.findById(instrumentId);
  if (!inst) {
    sendError(ws, "INVALID_PARAMS", "Unknown instrument");
    return;
  }

  wsManager.addSubscription(ws, instrumentId, tf);
  ws.send(JSON.stringify({ type: "subscribed", instrument: instrumentId }));

  const candles = await priceProvider.getCandles(instrumentId, tf, 200);
  const activeCandle = priceProvider.getActiveCandle(instrumentId, tf);

  let price: number | null = null;
  try {
    price = priceProvider.getPrice(instrumentId);
  } catch {
    /* price engine may not have a tick yet */
  }
  if (price == null && candles.length > 0) {
    price = candles[candles.length - 1].close;
  }
  const marketOpen = isMarketOpen(inst.type);

  let marketStatus: "OPEN" | "WEEKEND" | "MAINTENANCE" | "HOLIDAY" = "OPEN";
  if (!marketOpen) {
    const day = new Date().getUTCDay();
    marketStatus = day === 0 || day === 6 ? "WEEKEND" : "MAINTENANCE";
  }

  const now = Date.now();

  ws.send(
    JSON.stringify({
      type: "chart:init",
      instrument: instrumentId,
      data: {
        instrument: instrumentId,
        timeframe: tf,
        candles,
        activeCandle: activeCandle ?? null,
        price: price != null ? { value: price, timestamp: now } : null,
        serverTime: now,
        marketOpen,
        marketStatus,
        nextMarketOpenAt: null,
        topAlternatives: [],
      },
    }),
  );
}

function sendError(ws: WebSocket, code: string, message: string): void {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "error", code, message }));
    }
  } catch {
    /* connection already closed */
  }
}
