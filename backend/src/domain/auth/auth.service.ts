import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { verify as verifyTotp } from "otplib";
import type { User } from "../../generated/prisma/client.js";
import { userRepository } from "../../infrastructure/prisma/user.repository.js";
import { sessionRepository } from "../../infrastructure/prisma/session.repository.js";
import { partnerRepository } from "../../infrastructure/prisma/partner.repository.js";
import { partnerTrackingRepository } from "../../infrastructure/prisma/partner-tracking.repository.js";
import { getRedis } from "../../bootstrap/redis.js";
import { env } from "../../shared/types/env.js";
import { toUserPublicDTO, type UserPublicDTO } from "../../shared/dto/user.dto.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";

const BCRYPT_ROUNDS = 12;
const TEMP_TOKEN_TTL = 300;
const TEMP_TOKEN_PREFIX = "temp_token:";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
    refCode?: string;
  }): Promise<{ user: UserPublicDTO; rawToken: string }> {
    const exists = await userRepository.existsByEmail(data.email);
    if (exists) {
      throw AppError.conflict("Email already registered");
    }

    let partnerId: string | undefined;

    if (data.refCode) {
      try {
        const partner = await partnerRepository.findByRefCode(data.refCode);
        if (partner && partner.status === "ACTIVE") {
          partnerId = partner.id;
        }
      } catch (err) {
        logger.warn({ err, refCode: data.refCode }, "register: failed to resolve refCode, continuing without partner");
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await userRepository.createWithAccounts({
      email: data.email,
      password: hashedPassword,
      partnerId,
    });

    if (partnerId) {
      try {
        await partnerTrackingRepository.recordEvent({
          partnerId,
          userId: user.id,
          type: "REGISTRATION",
        });
      } catch (err) {
        logger.warn({ err, partnerId, userId: user.id }, "register: failed to record REGISTRATION event");
      }
    }

    const rawToken = await this.createSession(
      user.id,
      data.userAgent,
      data.ipAddress,
    );

    return { user: toUserPublicDTO(user), rawToken };
  },

  /**
   * Google OAuth: find/link/create user, then session or 2FA temp token.
   */
  async completeGoogleOAuth(data: {
    googleId: string;
    email: string;
    emailVerified: boolean;
    givenName?: string | null;
    familyName?: string | null;
    name?: string | null;
    refCode?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<
    | { outcome: "session"; rawToken: string }
    | { outcome: "2fa"; tempToken: string }
  > {
    if (!data.emailVerified) {
      throw AppError.badRequest("Google email is not verified");
    }

    const email = data.email.trim().toLowerCase();
    let firstName =
      data.givenName?.trim() ||
      (data.name?.trim()
        ? data.name.trim().split(/\s+/)[0] || null
        : null);
    let lastName =
      data.familyName?.trim() ||
      (data.name?.trim()
        ? data.name.trim().split(/\s+/).slice(1).join(" ") || null
        : null);
    if (firstName === "") firstName = null;
    if (lastName === "") lastName = null;

    const byGoogle = await userRepository.findByGoogleId(data.googleId);
    if (byGoogle) {
      return this.finishOAuthLogin(byGoogle, data.userAgent, data.ipAddress);
    }

    const byEmail = await userRepository.findByEmail(email);
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== data.googleId) {
        throw AppError.conflict("This email is linked to another Google account");
      }
      const linked = await userRepository.linkGoogleAccount(byEmail.id, {
        googleId: data.googleId,
        firstName,
        lastName,
      });
      return this.finishOAuthLogin(linked, data.userAgent, data.ipAddress);
    }

    let partnerId: string | undefined;
    if (data.refCode) {
      try {
        const partner = await partnerRepository.findByRefCode(data.refCode);
        if (partner && partner.status === "ACTIVE") {
          partnerId = partner.id;
        }
      } catch (err) {
        logger.warn(
          { err, refCode: data.refCode },
          "completeGoogleOAuth: failed to resolve refCode",
        );
      }
    }

    const user = await userRepository.createWithAccounts({
      email,
      password: null,
      googleId: data.googleId,
      firstName,
      lastName,
      partnerId,
    });

    if (partnerId) {
      try {
        await partnerTrackingRepository.recordEvent({
          partnerId,
          userId: user.id,
          type: "REGISTRATION",
        });
      } catch (err) {
        logger.warn(
          { err, partnerId, userId: user.id },
          "completeGoogleOAuth: failed to record REGISTRATION event",
        );
      }
    }

    const rawToken = await this.createSession(
      user.id,
      data.userAgent,
      data.ipAddress,
    );
    return { outcome: "session", rawToken };
  },

  async finishOAuthLogin(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<
    | { outcome: "session"; rawToken: string }
    | { outcome: "2fa"; tempToken: string }
  > {
    if (!user.isActive) {
      throw AppError.unauthorized("Invalid credentials");
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = generateToken();
      const redis = getRedis();
      await redis.set(
        `${TEMP_TOKEN_PREFIX}${tempToken}`,
        user.id,
        "EX",
        TEMP_TOKEN_TTL,
      );
      return { outcome: "2fa", tempToken };
    }

    const rawToken = await this.createSession(
      user.id,
      userAgent,
      ipAddress,
    );
    return { outcome: "session", rawToken };
  },

  async login(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<
    | { requires2FA: true; tempToken: string }
    | { requires2FA: false; user: UserPublicDTO; rawToken: string }
  > {
    const user = await userRepository.findByEmail(data.email);

    if (!user || !user.password) {
      throw AppError.unauthorized("Invalid credentials");
    }

    if (!user.isActive) {
      throw AppError.unauthorized("Invalid credentials");
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw AppError.unauthorized("Invalid credentials");
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = generateToken();
      const redis = getRedis();
      await redis.set(
        `${TEMP_TOKEN_PREFIX}${tempToken}`,
        user.id,
        "EX",
        TEMP_TOKEN_TTL,
      );
      return { requires2FA: true, tempToken };
    }

    const rawToken = await this.createSession(
      user.id,
      data.userAgent,
      data.ipAddress,
    );

    return { requires2FA: false, user: toUserPublicDTO(user), rawToken };
  },

  async verify2FA(data: {
    tempToken: string;
    code: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ user: UserPublicDTO; rawToken: string }> {
    const redis = getRedis();
    const userId = await redis.get(`${TEMP_TOKEN_PREFIX}${data.tempToken}`);
    if (!userId) {
      throw AppError.unauthorized("Invalid or expired token");
    }

    const user = await userRepository.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw AppError.unauthorized("Invalid or expired token");
    }

    const result = verifyTotp({
      token: data.code,
      secret: user.twoFactorSecret,
    });

    if (!result) {
      throw AppError.unauthorized("Invalid 2FA code");
    }

    await redis.del(`${TEMP_TOKEN_PREFIX}${data.tempToken}`);

    const rawToken = await this.createSession(
      user.id,
      data.userAgent,
      data.ipAddress,
    );

    return { user: toUserPublicDTO(user), rawToken };
  },

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await sessionRepository.deleteByTokenHash(tokenHash);
  },

  async getMe(userId: string): Promise<UserPublicDTO> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return toUserPublicDTO(user);
  },

  async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const config = env();
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await sessionRepository.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return rawToken;
  },
};
