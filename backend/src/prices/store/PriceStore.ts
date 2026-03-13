import { getRedisClient } from '../../bootstrap/redis.js';
import type { PriceTick } from '../PriceTypes.js';
import { logger } from '../../shared/logger.js';

function priceKey(instrumentId: string): string {
  return `price:${instrumentId}`;
}

export class PriceStore {
  async setCurrentPrice(instrumentId: string, tick: PriceTick): Promise<void> {
    const redis = getRedisClient();
    const data = JSON.stringify(tick);
    await redis.set(priceKey(instrumentId), data);
  }

  async getCurrentPrice(instrumentId: string): Promise<PriceTick | null> {
    const redis = getRedisClient();
    const data = await redis.get(priceKey(instrumentId));

    if (!data) return null;

    try {
      if (typeof data === 'string') {
        return JSON.parse(data) as PriceTick;
      }
      if (typeof data === 'object') {
        return data as PriceTick;
      }
      return null;
    } catch (error) {
      logger.error({ err: error }, 'Failed to parse current price from store');
      return null;
    }
  }

  async clear(instrumentId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(priceKey(instrumentId));
  }
}
