/**
 * Single WebSocket connection for ALL real instruments.
 * Subscribes to all pairs at once, routes ticks via callback.
 */

import WebSocket from "ws";
import { logger } from "../../shared/logger.js";
import type { PriceTick } from "./OtcPriceEngine.js";

interface InitMeta {
  session_uid: string;
  time_mult: number;
  start_time: number;
  order: string[];
  mapping: Record<string, string>;
}

const BASE_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const MAX_PENDING_UPDATES = 1_000;

export type RealTickCallback = (tick: PriceTick) => void;

interface Subscription {
  instrumentId: string;
}

export class RealWebSocketHub {
  private ws: WebSocket | null = null;
  private isRunning = false;
  private meta: InitMeta | null = null;
  private pendingUpdates: string[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private subscriptions = new Map<string, Subscription[]>();
  private allPairs: string[] = [];
  private onTick: RealTickCallback;

  private timeOffsetMs = 0;
  private offsetCalculated = false;

  private reconnectAttempt = 0;

  constructor(
    private apiKey: string,
    onTick: RealTickCallback,
  ) {
    this.onTick = onTick;
  }

  subscribe(pair: string, instrumentId: string): void {
    const existing = this.subscriptions.get(pair) ?? [];
    existing.push({ instrumentId });
    this.subscriptions.set(pair, existing);

    if (!this.allPairs.includes(pair)) {
      this.allPairs.push(pair);
    }

    logger.debug({ instrumentId, pair }, "RealWebSocketHub: subscribed");
  }

  start(): void {
    if (this.isRunning) {
      logger.warn("RealWebSocketHub already running");
      return;
    }

    if (this.allPairs.length === 0) {
      logger.warn("RealWebSocketHub: no pairs to subscribe, skipping start");
      return;
    }

    logger.info(
      { pairCount: this.allPairs.length, pairs: this.allPairs.join(", ") },
      "Starting RealWebSocketHub",
    );
    this.isRunning = true;
    this.connect();
  }

  private connect(): void {
    if (!this.isRunning) return;

    try {
      this.ws = new WebSocket("wss://api.xchangeapi.com/websocket/live", {
        headers: { "api-key": this.apiKey },
      });

      this.ws.on("open", () => {
        logger.info("RealWebSocketHub: WebSocket connected");
        this.reconnectAttempt = 0;

        const subscribeMessage = JSON.stringify({ pairs: this.allPairs });
        logger.info({ pairCount: this.allPairs.length }, "RealWebSocketHub: subscribing to pairs");
        this.ws?.send(subscribeMessage);
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("error", (error: Error) => {
        logger.error({ err: error }, "RealWebSocketHub: WebSocket error");
      });

      this.ws.on("close", (code: number, reason: Buffer) => {
        logger.warn({ code, reason: reason.toString() }, "RealWebSocketHub: WebSocket closed");
        this.ws = null;
        this.meta = null;
        this.pendingUpdates = [];
        this.timeOffsetMs = 0;
        this.offsetCalculated = false;

        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });
    } catch (error) {
      logger.error({ err: error }, "RealWebSocketHub: failed to create WebSocket");
      if (this.isRunning) {
        this.scheduleReconnect();
      }
    }
  }

  /** Exponential backoff: 2s, 4s, 8s, 16s, 32s, 60s (max), with +-20% jitter */
  private scheduleReconnect(): void {
    this.reconnectAttempt++;

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    const jitter = delay * 0.2 * (Math.random() - 0.5);
    const finalDelay = Math.round(delay + jitter);

    logger.info({ delayMs: finalDelay, attempt: this.reconnectAttempt }, "RealWebSocketHub: reconnecting");

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, finalDelay);
  }

  private handleMessage(data: string): void {
    if (!data || data.length === 0) return;

    const code = data[0];
    const payload = data.slice(1);

    if (code === "0") {
      this.handleInit(payload);
      return;
    }

    if (code === "1") {
      this.handleUpdate(payload);
      return;
    }

    // code === '2' is ping — ignore
  }

  private handleInit(payload: string): void {
    try {
      const meta = JSON.parse(payload) as InitMeta;
      this.meta = meta;

      logger.info(
        { sessionUid: meta.session_uid, pairCount: Object.keys(meta.mapping).length },
        "RealWebSocketHub: INIT received",
      );

      const marketTimeMs = Math.floor(meta.start_time * 1_000);
      const serverTimeMs = Date.now();
      this.timeOffsetMs = serverTimeMs - marketTimeMs;
      this.offsetCalculated = false;

      if (this.pendingUpdates.length > 0) {
        logger.info({ count: this.pendingUpdates.length }, "Processing pending updates");
        const updates = [...this.pendingUpdates];
        this.pendingUpdates = [];
        for (const u of updates) this.processUpdate(u, meta);
      }
    } catch (error) {
      logger.error({ err: error }, "RealWebSocketHub: failed to parse INIT");
    }
  }

  private handleUpdate(payload: string): void {
    if (!this.meta) {
      this.pendingUpdates.push(payload);
      if (this.pendingUpdates.length > MAX_PENDING_UPDATES) {
        this.pendingUpdates = this.pendingUpdates.slice(-MAX_PENDING_UPDATES);
      }
      return;
    }
    this.processUpdate(payload, this.meta);
  }

  private processUpdate(payload: string, meta: InitMeta): void {
    try {
      const parts = payload.split("|");
      if (parts.length !== meta.order.length) return;

      const obj: Record<string, string> = {};
      meta.order.forEach((key, i) => {
        obj[key] = parts[i]!;
      });

      const nameIdx = obj["name"];
      if (!nameIdx) return;
      const pairName = meta.mapping[nameIdx];
      if (!pairName) return;

      const ask = Number(obj.ask);
      const bid = Number(obj.bid);
      if (!Number.isFinite(ask) || !Number.isFinite(bid) || ask <= 0 || bid <= 0) return;

      const price = (ask + bid) / 2;

      const relativeTime = Number(obj.time);
      if (isNaN(relativeTime)) return;

      const timestampSeconds = meta.start_time + relativeTime / meta.time_mult;
      const marketTimeMs = Math.floor(timestampSeconds * 1_000);

      if (!this.offsetCalculated) {
        const serverTimeMs = Date.now();
        this.timeOffsetMs = serverTimeMs - marketTimeMs;
        this.offsetCalculated = true;
        logger.debug({ offsetMs: this.timeOffsetMs }, "RealWebSocketHub: time offset calculated");
      }

      const timestampMs = marketTimeMs + this.timeOffsetMs;

      const subs = this.subscriptions.get(pairName);
      if (!subs || subs.length === 0) return;

      for (const sub of subs) {
        this.onTick({
          instrumentId: sub.instrumentId,
          price,
          timestamp: timestampMs,
        });
      }
    } catch (error) {
      logger.error({ err: error }, "RealWebSocketHub: failed to process update");
    }
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info("RealWebSocketHub: stopping");
    this.isRunning = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.meta = null;
    this.pendingUpdates = [];
    this.timeOffsetMs = 0;
    this.offsetCalculated = false;
    this.reconnectAttempt = 0;

    logger.info("RealWebSocketHub: stopped");
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getSubscribedPairsCount(): number {
    return this.allPairs.length;
  }
}
