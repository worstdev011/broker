import type { FastifyInstance } from 'fastify';
import { shutdownWithTimeout } from '../bootstrap/index.js';
import { logger } from '../shared/logger.js';

export function setupGracefulShutdown(app: FastifyInstance): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Best-effort: close WS connections if manager is available
      try {
        const { getWebSocketManager } = await import('../modules/websocket/websocket.routes.js');
        getWebSocketManager().closeAll();
      } catch {
        // WebSocket may not have been initialized
      }

      await shutdownWithTimeout();
      await app.close();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception — exiting');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });
}
