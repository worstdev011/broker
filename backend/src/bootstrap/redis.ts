import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

export type KeyValueStore = {
  set(key: string, value: string, ex?: 'EX', seconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
};

let redis: Redis | null = null;
let store: KeyValueStore | null = null;

function createKeyValueStore(client: Redis): KeyValueStore {
  return {
    async set(key: string, value: string, ex?: 'EX', seconds?: number): Promise<void> {
      if (ex === 'EX' && seconds != null) {
        await client.set(key, value, 'EX', seconds);
      } else {
        await client.set(key, value);
      }
    },
    async get(key: string): Promise<string | null> {
      return await client.get(key);
    },
    async del(key: string): Promise<void> {
      await client.del(key);
    },
  };
}

export async function connectRedis(): Promise<KeyValueStore> {
  if (store) {
    return store;
  }

  const url = env.REDIS_URL || 'redis://127.0.0.1:6379';
  if (!env.REDIS_URL) {
    logger.warn('REDIS_URL not set - connecting to local Redis at 127.0.0.1:6379');
  }

  redis = new Redis(url, { lazyConnect: true });

  redis.on('error', (err: Error) => {
    logger.error({ err }, 'Redis error');
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  try {
    await redis.connect();
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to Redis');
    throw error;
  }

  store = createKeyValueStore(redis);
  return store;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    store = null;
    logger.info('Redis disconnected');
  }
}

export function getRedisClient(): KeyValueStore {
  if (!store) {
    throw new Error('Redis not initialized. Call connectRedis() first.');
  }
  return store;
}
