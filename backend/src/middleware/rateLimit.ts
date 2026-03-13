import type { FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';
import {
  RATE_LIMIT_CACHE,
  RATE_LIMIT_MAX,
} from '../config/constants.js';

interface RateLimitErrorContext {
  statusCode: number;
  ban: boolean;
  after: string;
  max: number;
  ttl: number;
}

export async function registerGlobalRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    cache: RATE_LIMIT_CACHE,
    allowList: (request: FastifyRequest, key: string) => {
      if (request.url === '/health') return true;

      // Only skip rate limiting for local IPs in development
      if (env.NODE_ENV !== 'production') {
        if (['127.0.0.1', '::1'].includes(key)) return true;
        if (key.startsWith('192.168.') || key.startsWith('10.')) return true;
        if (key.startsWith('::ffff:192.168.') || key.startsWith('::ffff:10.')) return true;
      }

      return false;
    },
    errorResponseBuilder: (_request: FastifyRequest, context: RateLimitErrorContext) => ({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: Math.round(context.ttl / 1000),
    }),
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
}
