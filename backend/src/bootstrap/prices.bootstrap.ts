import { PriceEngineManager } from '../prices/PriceEngineManager.js';
import { bootstrapWebSocketEvents } from './websocket.bootstrap.js';
import { logger } from '../shared/logger.js';

let priceEngineManager: PriceEngineManager | null = null;

export async function bootstrapPrices(): Promise<PriceEngineManager> {
  if (priceEngineManager) {
    logger.warn('Price engine manager already initialized');
    return priceEngineManager;
  }

  priceEngineManager = new PriceEngineManager();
  priceEngineManager.start();

  await bootstrapWebSocketEvents(priceEngineManager);

  logger.info('PriceEngineManager bootstrapped');
  return priceEngineManager;
}

export async function shutdownPrices(): Promise<void> {
  if (priceEngineManager) {
    priceEngineManager.stop();
    priceEngineManager = null;
    logger.info('PriceEngineManager shut down');
  }
}

export function getPriceEngineManager(): PriceEngineManager {
  if (!priceEngineManager) {
    throw new Error('PriceEngineManager not initialized. Call bootstrapPrices() first.');
  }
  return priceEngineManager;
}
