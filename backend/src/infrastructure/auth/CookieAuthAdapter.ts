import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { SESSION_TTL_DAYS } from '../../config/constants.js';

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60;

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    signed: true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function getSessionToken(request: FastifyRequest): string | null {
  const cookie = request.cookies[COOKIE_NAME];
  if (!cookie) return null;

  const unsigned = request.unsignCookie(cookie);
  if (!unsigned.valid || !unsigned.value) return null;

  return unsigned.value;
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}
