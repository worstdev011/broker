import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { AuthService } from '../../domain/auth/AuthService.js';
import type { AuthResult } from '../../domain/auth/AuthTypes.js';
import type { RegisterInput, LoginInput, Verify2FAInput } from './auth.validation.js';
import { SessionNotFoundError, InvalidSessionError } from '../../domain/auth/AuthErrors.js';
import { setSessionCookie, getSessionToken, clearSessionCookie } from '../../infrastructure/auth/CookieAuthAdapter.js';
import { env } from '../../config/env.js';
import { getRedisClient } from '../../bootstrap/redis.js';
import { logger } from '../../shared/logger.js';

const OAUTH_STATE_PREFIX = 'oauth_state:';
const OAUTH_STATE_TTL_SEC = 600;

function frontendLocaleBase(): string {
  let origin = env.FRONTEND_URL.replace(/\/$/, '');
  const loc = env.FRONTEND_DEFAULT_LOCALE.replace(/^\/+|\/+$/g, '');
  if (!loc) return origin;
  // FRONTEND_URL must be origin only (e.g. http://localhost:3000); if it already
  // ends with /{locale}, do not append again (avoids /ru/ru → 404).
  while (origin.endsWith(`/${loc}`)) {
    origin = origin.slice(0, -(loc.length + 1));
  }
  return `${origin}/${loc}`;
}

function decodeGoogleIdTokenPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split('.');
  const payloadPart = parts[1];
  if (!payloadPart) {
    throw new Error('Invalid id_token format');
  }
  const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

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

  async googleOAuthStart(_request: FastifyRequest, reply: FastifyReply) {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return reply.status(503).send({ error: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'Google auth not configured' });
    }

    const state = randomBytes(16).toString('hex');
    const redis = getRedisClient();
    await redis.set(`${OAUTH_STATE_PREFIX}${state}`, '1', 'EX', OAUTH_STATE_TTL_SEC);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    return reply.code(302).redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  async googleOAuthCallback(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as Record<string, string | undefined>;
    const base = frontendLocaleBase();

    if (q.error) {
      return reply.code(302).redirect(`${base}?error=google_denied`);
    }

    const code = q.code;
    const state = q.state;
    if (!code || !state) {
      return reply.code(302).redirect(`${base}?error=google_invalid_callback`);
    }

    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return reply.code(302).redirect(`${base}?error=google_not_configured`);
    }

    const redis = getRedisClient();
    const stateKey = `${OAUTH_STATE_PREFIX}${state}`;
    const stateValid = await redis.get(stateKey);
    if (!stateValid) {
      return reply.code(302).redirect(`${base}?error=google_invalid_state`);
    }
    await redis.del(stateKey);

    let tokenRes: Response;
    try {
      tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
    } catch (err) {
      logger.error({ err }, 'Google token exchange fetch failed');
      return reply.code(302).redirect(`${base}?error=google_token_failed`);
    }

    if (!tokenRes.ok) {
      logger.warn({ status: tokenRes.status, body: await tokenRes.text() }, 'Google token exchange failed');
      return reply.code(302).redirect(`${base}?error=google_token_failed`);
    }

    const tokens = (await tokenRes.json()) as { id_token?: string };
    const idToken = tokens.id_token;
    if (!idToken) {
      return reply.code(302).redirect(`${base}?error=google_no_id_token`);
    }

    let payload: Record<string, unknown>;
    try {
      payload = decodeGoogleIdTokenPayload(idToken);
    } catch (err) {
      logger.warn({ err }, 'Failed to decode Google id_token');
      return reply.code(302).redirect(`${base}?error=google_bad_token`);
    }

    const googleId = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const firstName = typeof payload.given_name === 'string' ? payload.given_name : undefined;
    const lastName = typeof payload.family_name === 'string' ? payload.family_name : undefined;

    if (!googleId || !email) {
      return reply.code(302).redirect(`${base}?error=google_no_email`);
    }

    const userAgent = request.headers['user-agent'] ?? null;
    const ipAddress = request.ip ?? null;

    try {
      const result = await this.authService.loginWithGoogle(
        googleId,
        email,
        firstName,
        lastName,
        userAgent,
        ipAddress,
      );

      if ('requires2FA' in result && result.requires2FA) {
        const tokenEnc = encodeURIComponent(result.tempToken);
        return reply.code(302).redirect(`${base}?google2fa=1&tempToken=${tokenEnc}`);
      }

      const authResult = result as AuthResult;
      setSessionCookie(reply, authResult.sessionToken);
      reply.generateCsrf();

      return reply.code(302).redirect(`${base}/terminal`);
    } catch (err) {
      logger.error({ err }, 'loginWithGoogle failed');
      return reply.code(302).redirect(`${base}?error=google_login_failed`);
    }
  }
}
