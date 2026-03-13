import type { FastifyRequest } from 'fastify';
import { getAuthService } from '../../shared/serviceFactory.js';
import { getSessionToken } from '../auth/CookieAuthAdapter.js';
import { SessionNotFoundError, InvalidSessionError } from '../../domain/auth/AuthErrors.js';
import { logger } from '../../shared/logger.js';

export async function authenticateWebSocket(request: FastifyRequest): Promise<string | null> {
  try {
    const token = getSessionToken(request);
    if (!token) {
      logger.warn('WebSocket auth rejected: no session token');
      return null;
    }

    const authService = getAuthService();
    const user = await authService.getMe(token);

    return user.id;
  } catch (error) {
    if (error instanceof SessionNotFoundError || error instanceof InvalidSessionError) {
      logger.warn('WebSocket auth rejected: invalid session');
      return null;
    }
    logger.error({ err: error }, 'WebSocket authentication error');
    return null;
  }
}
