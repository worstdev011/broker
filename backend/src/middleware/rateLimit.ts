/**
 * Rate limiting configuration
 *
 * Provides protection against:
 * - Brute force attacks (auth endpoints have stricter limits)
 * - DDoS
 * - Spam requests
 * - Accidental DoS (buggy clients)
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  RATE_LIMIT_CACHE,
  RATE_LIMIT_MAX,
} from '../config/constants.js';

/** Context passed to errorResponseBuilder by @fastify/rate-limit */
interface RateLimitErrorContext {
  statusCode: number;
  ban: boolean;
  after: string;
  max: number;
  ttl: number;
}

/**
 * Global rate limit configuration
 * Applied to all routes by default.
 * Auth routes use stricter per-route limits (see auth.routes.ts).
 */
const globalRateLimitConfig = {
  max: RATE_LIMIT_MAX,
  timeWindow: '1 minute',
  cache: RATE_LIMIT_CACHE,
  // Skip rate limiting for: localhost, LAN IPs (192.168.x.x, 10.x.x.x), health check
  allowList: (request: FastifyRequest, key: string) => {
    if (['127.0.0.1', '::1'].includes(key)) return true;
    if (key.startsWith('192.168.') || key.startsWith('10.') || key.startsWith('::ffff:192.168.') || key.startsWith('::ffff:10.')) return true;
    if (request.url === '/health') return true;
    return false;
  },
  errorResponseBuilder: (_request: FastifyRequest, context: RateLimitErrorContext) => {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: Math.round(context.ttl / 1000), // seconds
    };
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
};

/**
 * Register global rate limiting
 *
 * Applies to all routes. Auth routes override with stricter limits via config.rateLimit.
 */
export async function registerGlobalRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, globalRateLimitConfig);
}
