/**
 * Auth domain service - pure business logic
 */

import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { AccountService } from '../accounts/AccountService.js';
import { AccountType } from '../accounts/AccountTypes.js';
import type { RegisterInput, LoginInput, AuthResult, AuthResult2FA } from './AuthTypes.js';
import {
  UserNotFoundError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionNotFoundError,
  InvalidSessionError,
} from './AuthErrors.js';
import { hashPassword, verifyPassword, hashToken, generateSessionToken } from '../../utils/crypto.js';
import { generateUserId } from '../../utils/userId.js';
import { generateTempToken, verifyTempToken } from '../../utils/tempTokens.js';
import { TwoFactorService } from '../user/TwoFactorService.js';

export class AuthService {
  private twoFactorService: TwoFactorService;

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private accountService?: AccountService,
  ) {
    this.twoFactorService = new TwoFactorService();
  }

  /**
   * Register a new user
   * @param userAgent - Optional User-Agent header for session tracking
   * @param ipAddress - Optional IP address for session tracking
   */
  async register(
    input: RegisterInput,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(input.email);
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate unique 8-digit user id
    let userId: string = '';
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      userId = generateUserId();
      if (!(await this.userRepository.existsById(userId))) break;
      if (i === maxAttempts - 1) throw new Error('Failed to generate unique user ID');
    }

    // Create user
    const user = await this.userRepository.create({
      id: userId,
      email: input.email,
      password: passwordHash,
    });

    // 🔥 FLOW REGISTER-ACCOUNTS: Сразу создаём real и demo; по умолчанию активен реальный счёт
    if (this.accountService) {
      await this.accountService.createAccount({ userId: user.id, type: AccountType.REAL });
      await this.accountService.createAccount({ userId: user.id, type: AccountType.DEMO });
    }

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        phone: user.phone,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        avatarUrl: user.avatarUrl,
      },
      sessionToken,
    };
  }

  /**
   * Login user
   * 🔥 FLOW S3: If 2FA is enabled, return tempToken instead of creating session
   * @param userAgent - Optional User-Agent header for session tracking
   * @param ipAddress - Optional IP address for session tracking
   */
  async login(
    input: LoginInput,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult | AuthResult2FA> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // 🔥 FLOW S3: Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Return temp token - don't create session yet
      const tempToken = generateTempToken(user.id);
      return {
        requires2FA: true,
        tempToken,
        userId: user.id,
      };
    }

    // Create session (normal login without 2FA)
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        phone: user.phone,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        avatarUrl: user.avatarUrl,
        twoFactorSecret: user.twoFactorSecret,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorBackupCodes: user.twoFactorBackupCodes,
      },
      sessionToken,
    };
  }

  /**
   * 🔥 FLOW S3: Verify 2FA code and create session
   */
  async verifyLogin2FA(
    tempToken: string,
    code: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult> {
    // Verify temp token
    const userId = verifyTempToken(tempToken);
    if (!userId) {
      throw new InvalidSessionError('Invalid or expired temporary token');
    }

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA is not enabled for this user');
    }

    // Verify TOTP code or backup code
    const isValidToken = await this.twoFactorService.verifyToken(user.twoFactorSecret, code);
    const isValidBackup = user.twoFactorBackupCodes
      ? this.twoFactorService.verifyBackupCode(code, user.twoFactorBackupCodes)
      : false;

    if (!isValidToken && !isValidBackup) {
      throw new InvalidCredentialsError('Invalid 2FA code');
    }

    // If backup code was used, remove it
    if (isValidBackup && user.twoFactorBackupCodes) {
      const updatedCodes = this.twoFactorService.removeBackupCode(code, user.twoFactorBackupCodes);
      // Update backup codes in repository
      await this.userRepository.updateBackupCodes(user.id, updatedCodes);
    }

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        phone: user.phone,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        avatarUrl: user.avatarUrl,
        twoFactorSecret: user.twoFactorSecret,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorBackupCodes: user.twoFactorBackupCodes,
      },
      sessionToken,
    };
  }

  /**
   * Logout user (delete session)
   */
  async logout(sessionToken: string): Promise<void> {
    const tokenHash = hashToken(sessionToken);
    await this.sessionRepository.deleteByToken(tokenHash);
  }

  /**
   * Get current user by session token
   */
  async getMe(sessionToken: string): Promise<Omit<import('./AuthTypes.js').User, 'password'>> {
    const tokenHash = hashToken(sessionToken);

    // Find session
    const session = await this.sessionRepository.findByToken(tokenHash);
    if (!session) {
      throw new SessionNotFoundError();
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      throw new InvalidSessionError();
    }

    // Find user
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

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
      dateOfBirth: user.dateOfBirth,
      avatarUrl: user.avatarUrl,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorBackupCodes: user.twoFactorBackupCodes,
    };
  }
}
