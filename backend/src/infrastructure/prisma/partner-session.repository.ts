import { randomBytes, createHash } from "node:crypto";
import type { PartnerSession } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

const SESSION_TTL_DAYS = 30;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const partnerSessionRepository = {
  async create(data: {
    partnerId: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ session: PartnerSession; rawToken: string }> {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await prisma.partnerSession.create({
      data: {
        partnerId: data.partnerId,
        tokenHash,
        expiresAt,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
      },
    });

    return { session, rawToken };
  },

  async findByTokenHash(tokenHash: string): Promise<PartnerSession | null> {
    return prisma.partnerSession.findUnique({ where: { tokenHash } });
  },

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await prisma.partnerSession.deleteMany({ where: { tokenHash } });
  },
};

export { hashToken as hashPartnerToken };
