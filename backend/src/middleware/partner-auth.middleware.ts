import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { partnerSessionRepository } from "../infrastructure/prisma/partner-session.repository.js";
import { AppError } from "../shared/errors/AppError.js";

const PARTNER_SESSION_COOKIE = "partner_session";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function requirePartnerAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const signed = request.cookies[PARTNER_SESSION_COOKIE];
  if (!signed) {
    throw AppError.unauthorized();
  }

  const unsigned = request.unsignCookie(signed);
  if (!unsigned.valid || !unsigned.value) {
    throw AppError.unauthorized();
  }

  const tokenHash = hashToken(unsigned.value);
  const session = await partnerSessionRepository.findByTokenHash(tokenHash);

  if (!session) {
    throw AppError.unauthorized();
  }

  if (session.expiresAt < new Date()) {
    throw AppError.unauthorized("Session expired");
  }

  request.partnerId = session.partnerId;
}
