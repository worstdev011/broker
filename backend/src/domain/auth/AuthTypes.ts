/**
 * Domain types for Auth
 */

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
  updatedAt: Date;
  // FLOW U1: Base Profile fields
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  country?: string | null;
  currency?: string | null; // 🔥 Валюта — устанавливается один раз
  dateOfBirth?: Date | null;
  avatarUrl?: string | null;
  // 🔥 FLOW S3: Two-Factor Authentication
  twoFactorSecret?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[]; // Array of hashed backup codes
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  // 🔥 FLOW S1: Session metadata
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  sessionToken: string;
}

// 🔥 FLOW S3: Two-step login result
export interface AuthResult2FA {
  requires2FA: true;
  tempToken: string;
  userId: string;
}
