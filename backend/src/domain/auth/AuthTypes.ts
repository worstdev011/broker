export interface User {
  id: string;
  email: string;
  password: string | null;
  googleId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  country?: string | null;
  currency?: string | null;
  dateOfBirth?: Date | null;
  avatarUrl?: string | null;
  twoFactorSecret?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[];
  kycStatus?: string | null;
  kycApplicantId?: string | null;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
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

/** Safe user shape returned from auth/profile APIs */
export type AuthUserPublic = Omit<User, 'password' | 'twoFactorSecret' | 'twoFactorBackupCodes'> & {
  hasPassword: boolean;
};

export interface AuthResult {
  user: AuthUserPublic;
  sessionToken: string;
}

export interface AuthResult2FA {
  requires2FA: true;
  tempToken: string;
  userId: string;
}
