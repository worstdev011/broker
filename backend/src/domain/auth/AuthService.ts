import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { AccountService } from '../accounts/AccountService.js';
import { AccountType } from '../accounts/AccountTypes.js';
import type {
  RegisterInput,
  LoginInput,
  AuthResult,
  AuthResult2FA,
  User,
  AuthUserPublic,
} from './AuthTypes.js';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionNotFoundError,
  InvalidSessionError,
} from './AuthErrors.js';
import { UserNotFoundError } from '../user/UserErrors.js';
import { hashPassword, verifyPassword, hashToken, generateSessionToken } from '../../utils/crypto.js';
import { generateUserId } from '../../utils/userId.js';
import { createTempToken, verifyTempToken } from '../../utils/tempTokens.js';
import { TwoFactorService } from '../user/TwoFactorService.js';
import { SESSION_TTL_DAYS } from '../../config/constants.js';

/** Fields safe to return in API responses (no secrets, no googleId) */
export function toAuthUserPublic(user: User): AuthUserPublic {
  return {
    id: user.id,
    email: user.email,
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
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    kycStatus: user.kycStatus,
    kycApplicantId: user.kycApplicantId,
    hasPassword: !!user.password,
  };
}

function toUserDTO(user: User): AuthUserPublic {
  return toAuthUserPublic(user);
}

export class AuthService {
  private twoFactorService: TwoFactorService;

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private accountService?: AccountService,
  ) {
    this.twoFactorService = new TwoFactorService();
  }

  private async createSession(
    userId: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<string> {
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

    await this.sessionRepository.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    return sessionToken;
  }

  private async generateUniqueUserId(): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const userId = generateUserId();
      if (!(await this.userRepository.existsById(userId))) {
        return userId;
      }
    }
    throw new Error('Failed to generate unique user ID');
  }

  async register(
    input: RegisterInput,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(input.email);
    }

    const passwordHash = await hashPassword(input.password);

    const userId = await this.generateUniqueUserId();

    const user = await this.userRepository.create({
      id: userId,
      email: input.email,
      password: passwordHash,
    });

    if (this.accountService) {
      await this.accountService.createAccount({ userId: user.id, type: AccountType.REAL });
      await this.accountService.createAccount({ userId: user.id, type: AccountType.DEMO });
    }

    const sessionToken = await this.createSession(user.id, userAgent, ipAddress);

    return { user: toUserDTO(user), sessionToken };
  }

  async login(
    input: LoginInput,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult | AuthResult2FA> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = await createTempToken(user.id);
      return { requires2FA: true, tempToken, userId: user.id };
    }

    const sessionToken = await this.createSession(user.id, userAgent, ipAddress);

    return { user: toUserDTO(user), sessionToken };
  }

  async loginWithGoogle(
    googleId: string,
    email: string,
    firstName: string | undefined,
    lastName: string | undefined,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult | AuthResult2FA> {
    let user = await this.userRepository.findByGoogleId(googleId);

    if (!user) {
      const existingByEmail = await this.userRepository.findByEmail(email);
      if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
          throw new InvalidCredentialsError();
        }
        if (!existingByEmail.googleId) {
          await this.userRepository.linkGoogleId(existingByEmail.id, googleId);
        }
        user = await this.userRepository.findById(existingByEmail.id);
      }
    }

    if (!user) {
      const userId = await this.generateUniqueUserId();
      user = await this.userRepository.createGoogleUser({
        id: userId,
        email,
        googleId,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
      });

      if (this.accountService) {
        await this.accountService.createAccount({ userId: user.id, type: AccountType.REAL });
        await this.accountService.createAccount({ userId: user.id, type: AccountType.DEMO });
      }
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = await createTempToken(user.id);
      return { requires2FA: true, tempToken, userId: user.id };
    }

    const sessionToken = await this.createSession(user.id, userAgent, ipAddress);

    return { user: toUserDTO(user), sessionToken };
  }

  async verifyLogin2FA(
    tempToken: string,
    code: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult> {
    const userId = await verifyTempToken(tempToken);
    if (!userId) {
      throw new InvalidSessionError('Invalid or expired temporary token');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new InvalidSessionError('2FA is not enabled for this user');
    }

    const isValidToken = await this.twoFactorService.verifyToken(user.twoFactorSecret, code);
    if (!isValidToken) {
      throw new InvalidCredentialsError('Invalid 2FA code');
    }

    const sessionToken = await this.createSession(user.id, userAgent, ipAddress);

    return { user: toUserDTO(user), sessionToken };
  }

  async logout(sessionToken: string): Promise<void> {
    const tokenHash = hashToken(sessionToken);
    await this.sessionRepository.deleteByToken(tokenHash);
  }

  async getMe(sessionToken: string): Promise<AuthUserPublic> {
    const tokenHash = hashToken(sessionToken);

    const session = await this.sessionRepository.findByToken(tokenHash);
    if (!session) {
      throw new SessionNotFoundError();
    }

    if (session.expiresAt < new Date()) {
      throw new InvalidSessionError();
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UserNotFoundError(session.userId);
    }

    return toUserDTO(user);
  }
}
