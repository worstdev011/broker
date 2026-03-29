import Redis from "ioredis";
import { env } from "../shared/types/env.js";
import { logger } from "../shared/logger.js";

let redisClient: Redis | null = null;

export async function connectRedis(): Promise<void> {
  try {
    const config = env();
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await redisClient.connect();
    const pong = await redisClient.ping();

    if (pong !== "PONG") {
      throw new Error(`Unexpected Redis ping response: ${pong}`);
    }

    logger.info("Redis connected successfully");
  } catch (error) {
    logger.fatal({ err: error }, "Failed to connect to Redis");
    throw error;
  }
}

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error("Redis not initialized. Call connectRedis() first.");
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis disconnected");
  } catch (error) {
    logger.error({ err: error }, "Error disconnecting from Redis");
  }
}
