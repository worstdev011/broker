import type { WebSocket } from 'ws';
import type { WsEvent } from './WsEvents.js';
import { logger } from '../logger.js';
import { randomUUID } from 'crypto';

export class WsClient {
  public userId: string | null = null;
  public isAuthenticated = false;
  public subscriptions = new Set<string>();
  public activeTimeframe: string | null = null;
  public sessionId: string;
  public messageCount = 0;
  public rateLimitWindowStart = Date.now();

  constructor(private socket: WebSocket) {
    this.sessionId = randomUUID();
  }

  ping(): void {
    try {
      if (this.socket?.readyState === 1) {
        this.socket.ping();
      }
    } catch (error) {
      logger.debug({ err: error }, 'WsClient ping failed');
    }
  }

  send(event: WsEvent): void {
    try {
      if (!this.socket) {
        logger.warn('Cannot send WS event: socket unavailable');
        return;
      }
      this.socket.send(JSON.stringify(event));
    } catch (error) {
      logger.error({ err: error }, 'Failed to send WS event');
    }
  }

  sendRaw(data: string | Buffer): void {
    try {
      if (!this.socket) return;
      this.socket.send(data);
    } catch (error) {
      logger.error({ err: error }, 'Failed to send raw WS data');
    }
  }

  close(): void {
    try {
      if (!this.socket) return;
      this.socket.close();
    } catch (error) {
      logger.error({ err: error }, 'Failed to close WS connection');
    }
  }

  isOpen(): boolean {
    try {
      return this.socket?.readyState === 1;
    } catch {
      return false;
    }
  }
}
