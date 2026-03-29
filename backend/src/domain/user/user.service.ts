import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { toDataURL } from "qrcode";
import { generateSecret as generateTotpSecret } from "otplib";
import { prisma } from "../../infrastructure/prisma/client.js";
import { userRepository } from "../../infrastructure/prisma/user.repository.js";
import { fileStorage } from "../../infrastructure/storage/FileStorage.js";
import { toUserPublicDTO, type UserPublicDTO } from "../../shared/dto/user.dto.js";
import { AppError } from "../../shared/errors/AppError.js";

const BCRYPT_ROUNDS = 12;

export const userService = {
  async getProfile(userId: string): Promise<UserPublicDTO> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    return toUserPublicDTO(user);
  },

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      nickname?: string;
      phone?: string;
      country?: string;
      dateOfBirth?: string;
      currency?: string;
    },
  ): Promise<UserPublicDTO> {
    if (data.nickname) {
      const existing = await prisma.user.findUnique({ where: { nickname: data.nickname } });
      if (existing && existing.id !== userId) {
        throw AppError.conflict("Nickname already taken");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.currency !== undefined) updateData.currency = data.currency;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return toUserPublicDTO(user);
  },

  async uploadAvatar(userId: string, buffer: Buffer, filename: string): Promise<string> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");

    if (user.avatarUrl) {
      await fileStorage.deleteAvatar(user.avatarUrl);
    }

    const avatarUrl = await fileStorage.saveAvatar(buffer, filename);
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return avatarUrl;
  },

  async deleteAvatar(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (user.avatarUrl) {
      await fileStorage.deleteAvatar(user.avatarUrl);
    }
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  },

  async deleteAccount(userId: string, password?: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");

    if (user.password && password) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw AppError.unauthorized("Invalid password");
    } else if (user.password && !password) {
      throw AppError.badRequest("Password is required to delete account");
    }

    if (user.avatarUrl) {
      await fileStorage.deleteAvatar(user.avatarUrl);
    }

    await prisma.user.delete({ where: { id: userId } });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (!user.password) {
      throw AppError.badRequest("No password set. Use set-password instead.");
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw AppError.unauthorized("Invalid current password");

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  },

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (user.password) {
      throw AppError.badRequest("Password already set. Use change-password instead.");
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  },

  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw AppError.notFound("Session not found");
    }
    await prisma.session.delete({ where: { id: sessionId } });
  },

  async deleteOtherSessions(userId: string, currentTokenHash: string): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: { userId, tokenHash: { not: currentTokenHash } },
    });
    return result.count;
  },

  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (user.twoFactorEnabled) throw AppError.conflict("2FA is already enabled");

    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const otpauth = `otpauth://totp/Comfortrade:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Comfortrade&algorithm=SHA1&digits=6&period=30`;
    const qrCode = await toDataURL(otpauth);

    return { secret, qrCode };
  },

  async verify2FA(userId: string, code: string): Promise<void> {
    const { verify } = await import("otplib");
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (!user.twoFactorSecret) throw AppError.badRequest("2FA not initiated. Call enable first.");
    if (user.twoFactorEnabled) throw AppError.conflict("2FA is already verified");

    const valid = verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw AppError.unauthorized("Invalid 2FA code");

    const backupCodes = Array.from({ length: 8 }, () =>
      randomBytes(4).toString("hex"),
    );

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorBackupCodes: backupCodes },
    });
  },

  async disable2FA(userId: string, password: string, code: string): Promise<void> {
    const { verify } = await import("otplib");
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (!user.twoFactorEnabled) throw AppError.badRequest("2FA is not enabled");

    if (user.password) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw AppError.unauthorized("Invalid password");
    }

    const validCode = verify({ token: code, secret: user.twoFactorSecret! });
    if (!validCode) throw AppError.unauthorized("Invalid 2FA code");

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });
  },
};
