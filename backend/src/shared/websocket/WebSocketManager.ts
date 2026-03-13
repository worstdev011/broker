import type { WsEvent } from './WsEvents.js';
import { WsClient } from './WsClient.js';
import { logger } from '../logger.js';
import { WS_HEARTBEAT_INTERVAL_MS } from '../../config/constants.js';

export class WebSocketManager {
  private clients: Set<WsClient> = new Set();
  private userClients: Map<string, Set<WsClient>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  register(client: WsClient): void {
    this.clients.add(client);

    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client);
    }

    logger.debug({ total: this.clients.size, userId: client.userId }, 'WebSocket client registered');
  }

  unregister(client: WsClient): void {
    this.clients.delete(client);

    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(client);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    logger.debug({ total: this.clients.size }, 'WebSocket client unregistered');
  }

  broadcast(event: WsEvent): void {
    let sent = 0;
    const deadClients: WsClient[] = [];

    for (const client of this.clients) {
      if (!client.isAuthenticated) continue;

      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }
        client.send(event);
        sent++;
      } catch (error) {
        logger.error({ err: error }, 'Failed to send broadcast');
        deadClients.push(client);
      }
    }

    for (const client of deadClients) this.unregister(client);

    if (sent > 0) {
      logger.debug({ type: event.type, sent }, 'Broadcast sent');
    }
  }

  sendToUser(userId: string, event: WsEvent): void {
    const userClients = this.userClients.get(userId);
    if (!userClients) return;

    const deadClients: WsClient[] = [];

    for (const client of userClients) {
      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }
        client.send(event);
      } catch (error) {
        logger.error({ err: error }, 'Failed to send to user');
        deadClients.push(client);
      }
    }

    for (const client of deadClients) this.unregister(client);
  }

  broadcastToInstrument(instrument: string, event: WsEvent): void {
    const deadClients: WsClient[] = [];

    for (const client of this.clients) {
      if (!client.isAuthenticated || !client.subscriptions.has(instrument)) continue;

      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }
        client.send(event);
      } catch (error) {
        logger.error({ err: error }, 'Failed to send broadcast to instrument');
        deadClients.push(client);
      }
    }

    for (const client of deadClients) this.unregister(client);
  }

  /**
   * Broadcast candle event only to clients subscribed to this instrument AND timeframe.
   * Clients without activeTimeframe receive all candle events.
   */
  broadcastCandleToInstrument(instrument: string, timeframe: string, event: WsEvent): void {
    const deadClients: WsClient[] = [];

    for (const client of this.clients) {
      if (!client.isAuthenticated || !client.subscriptions.has(instrument)) continue;
      if (client.activeTimeframe && client.activeTimeframe !== timeframe) continue;

      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }
        client.send(event);
      } catch (error) {
        logger.error({ err: error }, 'Failed to send candle broadcast');
        deadClients.push(client);
      }
    }

    for (const client of deadClients) this.unregister(client);
  }

  /**
   * Broadcast pre-serialized data to instrument subscribers.
   * string -> text frame, Buffer -> binary frame.
   */
  broadcastRawToInstrument(instrument: string, raw: string | Buffer): void {
    const deadClients: WsClient[] = [];

    for (const client of this.clients) {
      if (!client.isAuthenticated || !client.subscriptions.has(instrument)) continue;

      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }
        client.sendRaw(raw);
      } catch (error) {
        logger.error({ err: error }, 'Failed to send raw broadcast to instrument');
        deadClients.push(client);
      }
    }

    for (const client of deadClients) this.unregister(client);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      logger.warn('WebSocket heartbeat already running');
      return;
    }
    this.heartbeatInterval = setInterval(() => {
      const deadClients: WsClient[] = [];
      for (const client of this.clients) {
        if (!client.isAuthenticated) continue;
        try {
          if (client.isOpen()) {
            client.ping();
          } else {
            deadClients.push(client);
          }
        } catch {
          deadClients.push(client);
        }
      }
      for (const c of deadClients) this.unregister(c);
    }, WS_HEARTBEAT_INTERVAL_MS);
    logger.info({ intervalMs: WS_HEARTBEAT_INTERVAL_MS }, 'WebSocket heartbeat started');
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('WebSocket heartbeat stopped');
    }
  }

  closeAll(): void {
    this.stopHeartbeat();
    const count = this.clients.size;
    for (const client of this.clients) {
      try {
        client.send({ type: 'server:shutdown', data: { message: 'Server is shutting down' } });
        client.close();
      } catch (error) {
        logger.debug({ err: error }, 'Error closing WS client');
      }
    }
    this.clients.clear();
    this.userClients.clear();
    if (count > 0) {
      logger.info({ count }, 'Closed WebSocket connections');
    }
  }
}
