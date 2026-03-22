import { randomBytes } from 'crypto';
import { getRedisClient } from '../bootstrap/redis.js';

const TEMP_TOKEN_TTL_SEC = 5 * 60; // 5 minutes
const PREFIX = 'temp_token:';

/**
 * Create a one-time login step-2 token (2FA). Stored in Redis for multi-instance safety.
 */
export async function createTempToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const redis = getRedisClient();
  await redis.set(`${PREFIX}${token}`, userId, 'EX', TEMP_TOKEN_TTL_SEC);
  return token;
}

/**
 * Validate and consume a temp token. Returns userId or null if missing/expired.
 */
export async function verifyTempToken(token: string): Promise<string | null> {
  const redis = getRedisClient();
  const key = `${PREFIX}${token}`;
  const userId = await redis.get(key);
  if (!userId) return null;
  await redis.del(key);
  return userId;
}
