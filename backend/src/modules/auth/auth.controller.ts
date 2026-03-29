import type { FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../../domain/auth/auth.service.js";
import {
  registerBodySchema,
  loginBodySchema,
  twoFactorBodySchema,
} from "./auth.schema.js";
import { AppError } from "../../shared/errors/AppError.js";
import { env } from "../../shared/types/env.js";

export const SESSION_COOKIE_NAME = "session_token";

export function setSessionCookie(reply: FastifyReply, rawToken: string): void {
  const config = env();
  reply.setCookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    signed: true,
    sameSite: "strict",
    path: "/",
    maxAge: config.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export const authController = {
  async handleRegister(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const body = registerBodySchema.parse(request.body);

    const { user, rawToken } = await authService.register({
      email: body.email,
      password: body.password,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
      refCode: body.refCode,
    });

    setSessionCookie(reply, rawToken);
    const csrfToken = reply.generateCsrf();

    reply.status(201).send({ user, csrfToken });
  },

  async handleLogin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const body = loginBodySchema.parse(request.body);

    const result = await authService.login({
      email: body.email,
      password: body.password,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    if (result.requires2FA) {
      reply.send({ requires2FA: true, tempToken: result.tempToken });
      return;
    }

    setSessionCookie(reply, result.rawToken);
    const csrfToken = reply.generateCsrf();

    reply.send({ user: result.user, csrfToken });
  },

  async handle2FA(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const body = twoFactorBodySchema.parse(request.body);

    const { user, rawToken } = await authService.verify2FA({
      tempToken: body.tempToken,
      code: body.code,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    setSessionCookie(reply, rawToken);
    const csrfToken = reply.generateCsrf();

    reply.send({ user, csrfToken });
  },

  async handleLogout(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const signed = request.cookies[SESSION_COOKIE_NAME];
    if (signed) {
      const unsigned = request.unsignCookie(signed);
      if (unsigned.valid && unsigned.value) {
        await authService.logout(unsigned.value);
      }
    }

    clearSessionCookie(reply);
    reply.send({ success: true });
  },

  async handleMe(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.userId) {
      throw AppError.unauthorized();
    }
    const user = await authService.getMe(request.userId);
    reply.send({ user });
  },

  async handleCsrf(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const csrfToken = reply.generateCsrf();
    reply.send({ csrfToken });
  },
};
