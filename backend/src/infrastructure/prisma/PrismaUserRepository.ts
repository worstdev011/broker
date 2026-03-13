/**
 * Prisma implementation of UserRepository
 */

import { getPrismaClient } from '../../bootstrap/database.js';
import type { UserRepository, UpdateProfileData } from '../../ports/repositories/UserRepository.js';
import type { User } from '../../domain/auth/AuthTypes.js';

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async findById(id: string): Promise<User | null> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async existsById(id: string): Promise<boolean> {
    const prisma = getPrismaClient();
    const count = await prisma.user.count({ where: { id } });
    return count > 0;
  }

  private mapUser(user: {
    id: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
    phone: string | null;
    country: string | null;
    currency: string | null;
    dateOfBirth: Date | null;
    avatarUrl: string | null;
    twoFactorSecret: string | null;
    twoFactorEnabled: boolean;
    twoFactorBackupCodes: string[];
    kycStatus: string | null;
    kycApplicantId: string | null;
  }): User {
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      phone: user.phone,
      country: user.country,
      currency: user.currency,
      dateOfBirth: user.dateOfBirth,
      avatarUrl: user.avatarUrl,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorBackupCodes: user.twoFactorBackupCodes,
      kycStatus: user.kycStatus,
      kycApplicantId: user.kycApplicantId,
    };
  }

  async create(userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const prisma = getPrismaClient();
    const user = await prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        password: userData.password,
      },
    });

    return this.mapUser(user);
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<User> {
    const prisma = getPrismaClient();
    
    // 🔥 FLOW U1.1: Строим объект для обновления только переданных полей
    // Важно: dateOfBirth передается как Date, не string
    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.dateOfBirth !== undefined) {
      // Передаем Date или null, но не undefined
      updateData.dateOfBirth = data.dateOfBirth ?? null;
    }
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapUser(user);
  }

  async findByNickname(nickname: string): Promise<User | null> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { nickname },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  // 🔥 FLOW S3: Two-Factor Authentication methods
  async updateTwoFactorSecret(userId: string, secret: string | null): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
  }

  async enableTwoFactor(userId: string, backupCodes: string[]): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes,
      },
    });
  }

  async disableTwoFactor(userId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });
  }

  async updateBackupCodes(userId: string, backupCodes: string[]): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: backupCodes },
    });
  }

  // 🔥 FLOW U1.9: Delete user by ID (hard delete with cascade)
  async deleteById(userId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  // 🔥 FLOW U2: Update user password
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
  }
}
