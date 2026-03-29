import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../infrastructure/prisma/client";
import { AppError } from "../shared/errors/AppError";

const SESSION_COOKIE_NAME = "session_token";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const signed = request.cookies[SESSION_COOKIE_NAME];
  if (!signed) {
    throw AppError.unauthorized();
  }

  const unsigned = request.unsignCookie(signed);
  if (!unsigned.valid || !unsigned.value) {
    throw AppError.unauthorized();
  }

  const tokenHash = hashToken(unsigned.value);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session) {
    throw AppError.unauthorized();
  }

  if (session.expiresAt < new Date()) {
    throw AppError.unauthorized("Session expired");
  }

  request.userId = session.userId;
}
