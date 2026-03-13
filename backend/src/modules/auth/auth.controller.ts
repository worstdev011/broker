import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import type { AuthResult } from '../../domain/auth/AuthTypes.js';
import type { RegisterInput, LoginInput, Verify2FAInput } from './auth.validation.js';
import { SessionNotFoundError, InvalidSessionError } from '../../domain/auth/AuthErrors.js';
import { setSessionCookie, getSessionToken, clearSessionCookie } from '../../infrastructure/auth/CookieAuthAdapter.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) {
    const { email, password } = request.body;
    const userAgent = request.headers['user-agent'] ?? null;
    const ipAddress = request.ip ?? null;

    const result = await this.authService.register({ email, password }, userAgent, ipAddress);

    setSessionCookie(reply, result.sessionToken);
    const csrfToken = reply.generateCsrf();

    return reply.status(201).send({ user: result.user, csrfToken });
  }

  async login(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
    const { email, password } = request.body;
    const userAgent = request.headers['user-agent'] ?? null;
    const ipAddress = request.ip ?? null;

    const result = await this.authService.login({ email, password }, userAgent, ipAddress);

    if ('requires2FA' in result && result.requires2FA) {
      return reply.send({ requires2FA: true, tempToken: result.tempToken });
    }

    const authResult = result as AuthResult;
    setSessionCookie(reply, authResult.sessionToken);
    const csrfToken = reply.generateCsrf();

    return reply.send({ user: authResult.user, csrfToken });
  }

  async verifyLogin2FA(
    request: FastifyRequest<{ Body: Verify2FAInput }>,
    reply: FastifyReply,
  ) {
    const { tempToken, code } = request.body;
    const userAgent = request.headers['user-agent'] ?? null;
    const ipAddress = request.ip ?? null;

    const result = await this.authService.verifyLogin2FA(tempToken, code, userAgent, ipAddress);

    setSessionCookie(reply, result.sessionToken);
    const csrfToken = reply.generateCsrf();

    return reply.send({ user: result.user, csrfToken });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const token = getSessionToken(request);
    if (token) {
      await this.authService.logout(token);
    }

    clearSessionCookie(reply);
    return reply.send({ message: 'Logged out successfully' });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const token = getSessionToken(request);
    if (!token) {
      return reply.status(401).send({ error: 'NOT_AUTHENTICATED', message: 'Not authenticated' });
    }

    try {
      const user = await this.authService.getMe(token);
      return reply.send({ user });
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof InvalidSessionError) {
        clearSessionCookie(reply);
      }
      throw error;
    }
  }
}
