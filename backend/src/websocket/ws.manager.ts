import type { WebSocket } from "ws";
import { logger } from "../shared/logger.js";

const HEARTBEAT_INTERVAL_MS = 30_000;

interface ConnectionData {
  userId: string;
  subscriptions: Map<string, string>;
  connectedAt: number;
}

class WsManager {
  private userConnections = new Map<string, Set<WebSocket>>();
  private connectionData = new Map<WebSocket, ConnectionData>();
  private alive = new Map<WebSocket, boolean>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  addConnection(ws: WebSocket, userId: string): void {
    this.connectionData.set(ws, { userId, subscriptions: new Map(), connectedAt: Date.now() });
    this.alive.set(ws, true);

    let sockets = this.userConnections.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userConnections.set(userId, sockets);
    }
    sockets.add(ws);

    if (!this.heartbeatTimer && this.connectionData.size > 0) {
      this.startHeartbeat();
    }

    logger.debug({ userId, total: sockets.size }, "WS connection added");
  }

  removeConnection(ws: WebSocket): void {
    const data = this.connectionData.get(ws);
    if (!data) return;

    this.connectionData.delete(ws);
    this.alive.delete(ws);

    const sockets = this.userConnections.get(data.userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userConnections.delete(data.userId);
      }
    }

    if (this.connectionData.size === 0) {
      this.stopHeartbeat();
    }

    logger.debug(
      { userId: data.userId, subs: data.subscriptions.size },
      "WS connection removed",
    );
  }

  markAlive(ws: WebSocket): void {
    if (this.alive.has(ws)) {
      this.alive.set(ws, true);
    }
  }

  addSubscription(ws: WebSocket, instrument: string, timeframe: string): void {
    const data = this.connectionData.get(ws);
    if (data) data.subscriptions.set(instrument, timeframe);
  }

  removeSubscription(ws: WebSocket, instrument: string): void {
    const data = this.connectionData.get(ws);
    if (data) data.subscriptions.delete(instrument);
  }

  removeAllSubscriptions(ws: WebSocket): void {
    const data = this.connectionData.get(ws);
    if (data) data.subscriptions.clear();
  }

  sendToUser(userId: string, message: object): void {
    const sockets = this.userConnections.get(userId);
    if (!sockets) return;
    const payload = JSON.stringify(message);
    for (const ws of sockets) {
      this.safeSend(ws, payload);
    }
  }

  broadcastToInstrument(instrumentId: string, message: object): void {
    const payload = JSON.stringify(message);
    for (const [ws, data] of this.connectionData) {
      if (data.subscriptions.has(instrumentId)) {
        this.safeSend(ws, payload);
      }
    }
  }

  broadcastToInstrumentTimeframe(instrumentId: string, timeframe: string, message: object): void {
    const payload = JSON.stringify(message);
    for (const [ws, data] of this.connectionData) {
      if (data.subscriptions.get(instrumentId) === timeframe) {
        this.safeSend(ws, payload);
      }
    }
  }

  broadcastRawToInstrument(instrumentId: string, buffer: Buffer): void {
    for (const [ws, data] of this.connectionData) {
      if (data.subscriptions.has(instrumentId)) {
        this.safeSendRaw(ws, buffer);
      }
    }
  }

  broadcastAll(message: object): void {
    const payload = JSON.stringify(message);
    for (const ws of this.connectionData.keys()) {
      this.safeSend(ws, payload);
    }
  }

  getSubscribersCount(instrumentId: string): number {
    let count = 0;
    for (const data of this.connectionData.values()) {
      if (data.subscriptions.has(instrumentId)) count++;
    }
    return count;
  }

  getTotalConnections(): number {
    return this.connectionData.size;
  }

  disconnectUser(userId: string): void {
    const sockets = this.userConnections.get(userId);
    if (!sockets) return;
    for (const ws of [...sockets]) {
      this.removeConnection(ws);
      ws.terminate();
    }
  }

  getConnectionsInfo(): Array<{ userId: string; connectedAt: number; subscriptions: string[] }> {
    const result: Array<{ userId: string; connectedAt: number; subscriptions: string[] }> = [];
    for (const data of this.connectionData.values()) {
      result.push({
        userId: data.userId,
        connectedAt: data.connectedAt,
        subscriptions: [...data.subscriptions.keys()],
      });
    }
    return result;
  }

  private safeSend(ws: WebSocket, payload: string): void {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    } catch (error) {
      logger.warn({ err: error }, "Failed to send WS message");
    }
  }

  private safeSendRaw(ws: WebSocket, buffer: Buffer): void {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(buffer);
      }
    } catch (error) {
      logger.warn({ err: error }, "Failed to send WS binary message");
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [ws] of this.connectionData) {
        if (this.alive.get(ws) === false) {
          logger.debug("Terminating dead WS connection (no pong)");
          this.removeConnection(ws);
          ws.terminate();
          continue;
        }
        this.alive.set(ws, false);
        ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const wsManager = new WsManager();
