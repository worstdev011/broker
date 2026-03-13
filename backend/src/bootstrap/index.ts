import type { FastifyInstance } from 'fastify';
import { connectDatabase, disconnectDatabase } from './database.js';
import { connectRedis, disconnectRedis } from './redis.js';
import { initWebSocket } from './websocket.js';
import { bootstrapPrices, shutdownPrices } from './prices.bootstrap.js';
import { bootstrapTrades, shutdownTrades } from './trades.bootstrap.js';
import { shutdownWebSocketEvents } from './websocket.bootstrap.js';
import { bootstrapTimeUpdates, shutdownTimeUpdates } from './time.bootstrap.js';
import { registerBullBoard } from '../jobs/board.js';
import { logger } from '../shared/logger.js';

export async function bootstrapAll(app: FastifyInstance): Promise<void> {
  logger.info('Starting system bootstrap...');

  try {
    await connectDatabase();
    await connectRedis();
    await initWebSocket(app);
    await bootstrapPrices();
    await bootstrapTrades();
    await bootstrapTimeUpdates();
    await registerBullBoard(app);
    logger.info('System bootstrap completed');
  } catch (error) {
    logger.error({ err: error }, 'System bootstrap failed');
    await shutdownAll();
    throw error;
  }
}

const SHUTDOWN_TIMEOUT_MS = 10_000;

export async function shutdownAll(): Promise<void> {
  logger.info('Shutting down all systems...');

  const errors: Error[] = [];

  async function safeShutdown(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (error) {
      logger.error({ err: error }, `Failed to shut down ${name}`);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  await safeShutdown('trades', shutdownTrades);
  await safeShutdown('time updates', shutdownTimeUpdates);
  await safeShutdown('websocket events', shutdownWebSocketEvents);
  await safeShutdown('prices', shutdownPrices);
  await safeShutdown('database', disconnectDatabase);
  await safeShutdown('redis', disconnectRedis);

  if (errors.length > 0) {
    logger.warn(`Shutdown completed with ${errors.length} error(s)`);
  } else {
    logger.info('All systems shut down successfully');
  }
}

/** Returns a promise that rejects after SHUTDOWN_TIMEOUT_MS */
export function shutdownWithTimeout(): Promise<void> {
  return Promise.race([
    shutdownAll(),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Shutdown timed out')), SHUTDOWN_TIMEOUT_MS),
    ),
  ]);
}
