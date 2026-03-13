import type { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { registerWebSocketRoutes, getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import { logger } from '../shared/logger.js';

let wsInitialized = false;

export async function initWebSocket(app: FastifyInstance): Promise<void> {
  if (wsInitialized) {
    logger.warn('WebSocket already initialized');
    return;
  }

  logger.info('Initializing WebSocket server...');

  try {
    await app.register(fastifyWebsocket, {
      options: {
        maxPayload: 64 * 1024,
      },
    });

    await registerWebSocketRoutes(app);
    getWebSocketManager().startHeartbeat();

    wsInitialized = true;
    logger.info('WebSocket server initialized');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize WebSocket server');
    throw error;
  }
}

export function isWebSocketInitialized(): boolean {
  return wsInitialized;
}
