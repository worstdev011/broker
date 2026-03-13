import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSessionToken } from '../../infrastructure/auth/CookieAuthAdapter.js';
import { getAuthService, getUserRepository } from '../../shared/serviceFactory.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = getSessionToken(request);
  if (!token) {
    throw new AppError(401, 'Not authenticated', 'NOT_AUTHENTICATED');
  }

  const authService = getAuthService();
  const user = await authService.getMe(token);
  request.userId = user.id;
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const userId = request.userId;
  if (!userId) {
    throw new AppError(401, 'Not authenticated', 'NOT_AUTHENTICATED');
  }

  if (env.ADMIN_EMAILS.length === 0) {
    request.log.warn('ADMIN_EMAILS not configured');
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const userRepository = getUserRepository();
  const user = await userRepository.findById(userId);
  if (!user || !env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }
}
