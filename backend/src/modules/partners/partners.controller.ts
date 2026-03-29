import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { partnerRepository } from "../../infrastructure/prisma/partner.repository.js";
import {
  partnerSessionRepository,
  hashPartnerToken,
} from "../../infrastructure/prisma/partner-session.repository.js";
import { partnerTrackingRepository } from "../../infrastructure/prisma/partner-tracking.repository.js";
import { partnerService } from "../../domain/partners/partner.service.js";
import {
  registerPartnerBodySchema,
  loginPartnerBodySchema,
  trackClickBodySchema,
  paginationQuerySchema,
  withdrawalBodySchema,
} from "./partners.schema.js";
import { toPartnerPublicDTO } from "../../shared/dto/partner.dto.js";
import { AppError } from "../../shared/errors/AppError.js";
import { env } from "../../shared/types/env.js";
import { logger } from "../../shared/logger.js";

const PARTNER_SESSION_COOKIE = "partner_session";
const BCRYPT_ROUNDS = 12;

function setPartnerCookie(reply: FastifyReply, rawToken: string): void {
  const config = env();
  reply.setCookie(PARTNER_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    signed: true,
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

function clearPartnerCookie(reply: FastifyReply): void {
  reply.clearCookie(PARTNER_SESSION_COOKIE, { path: "/" });
}

export const partnersController = {
  async handleRegister(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const body = registerPartnerBodySchema.parse(request.body);

    const existing = await partnerRepository.findByEmail(body.email);
    if (existing) {
      throw AppError.conflict("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    const partner = await partnerRepository.create({
      email: body.email,
      password: hashedPassword,
      firstName: body.firstName,
      lastName: body.lastName,
      telegramHandle: body.telegramHandle,
    });

    const { rawToken } = await partnerSessionRepository.create({
      partnerId: partner.id,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    setPartnerCookie(reply, rawToken);
    reply.status(201).send({ partner: toPartnerPublicDTO(partner) });
  },

  async handleLogin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const body = loginPartnerBodySchema.parse(request.body);

    const partner = await partnerRepository.findByEmail(body.email);
    if (!partner) {
      throw AppError.unauthorized("Invalid credentials");
    }

    const valid = await bcrypt.compare(body.password, partner.password);
    if (!valid) {
      throw AppError.unauthorized("Invalid credentials");
    }

    if (partner.status === "SUSPENDED") {
      throw AppError.forbidden("Account suspended");
    }

    const { rawToken } = await partnerSessionRepository.create({
      partnerId: partner.id,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    setPartnerCookie(reply, rawToken);
    reply.send({ partner: toPartnerPublicDTO(partner) });
  },

  async handleLogout(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const signed = request.cookies[PARTNER_SESSION_COOKIE];
    if (signed) {
      const unsigned = request.unsignCookie(signed);
      if (unsigned.valid && unsigned.value) {
        const tokenHash = hashPartnerToken(unsigned.value);
        await partnerSessionRepository.deleteByTokenHash(tokenHash);
      }
    }

    clearPartnerCookie(reply);
    reply.send({ success: true });
  },

  async handleMe(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.partnerId) {
      throw AppError.unauthorized();
    }

    const partner = await partnerRepository.findById(request.partnerId);
    if (!partner) {
      throw AppError.notFound("Partner not found");
    }

    reply.send({ partner: toPartnerPublicDTO(partner) });
  },

  async handleTrackClick(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const body = trackClickBodySchema.parse(request.body);
      const partner = await partnerRepository.findByRefCode(body.refCode);

      if (partner && partner.status === "ACTIVE") {
        await partnerTrackingRepository.recordClick({
          partnerId: partner.id,
          ip: request.ip,
          userAgent: body.userAgent ?? request.headers["user-agent"],
          referer: body.referer,
        });
      }
    } catch (err) {
      logger.warn({ err }, "track-click: ignored error");
    }

    reply.send({ ok: true });
  },

  async handleDashboard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const dashboard = await partnerService.getDashboard(request.partnerId!);
    reply.send(dashboard);
  },

  async handleReferrals(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { page, limit } = paginationQuerySchema.parse(request.query);
    const result = await partnerService.getReferrals(request.partnerId!, page, limit);
    reply.send(result);
  },

  async handleEarnings(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { page, limit } = paginationQuerySchema.parse(request.query);
    const result = await partnerService.getEarnings(request.partnerId!, page, limit);
    reply.send(result);
  },

  async handleGetWithdrawals(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await partnerService.getWithdrawals(request.partnerId!);
    reply.send(result);
  },

  async handleRequestWithdrawal(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const body = withdrawalBodySchema.parse(request.body);
    const withdrawal = await partnerService.requestWithdrawal(
      request.partnerId!,
      body.amount,
      body.paymentMethod,
    );
    reply.status(201).send({ withdrawal });
  },
};
