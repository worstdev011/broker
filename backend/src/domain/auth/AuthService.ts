import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { AccountService } from '../accounts/AccountService.js';
import { AccountType } from '../accounts/AccountTypes.js';
import type { RegisterInput, LoginInput, AuthResult, AuthResult2FA, User } from './AuthTypes.js';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionNotFoundError,
  InvalidSessionError,
} from './AuthErrors.js';
import { UserNotFoundError } from '../user/UserErrors.js';
import { hashPassword, verifyPassword, hashToken, generateSessionToken } from '../../utils/crypto.js';
import { generateUserId } from '../../utils/userId.js';
import { generateTempToken, verifyTempToken } from '../../utils/tempTokens.js';
import { TwoFactorService } from '../user/TwoFactorService.js';
import { SESSION_TTL_DAYS } from '../../config/constants.js';

/** Fields safe to return in API responses */
function toUserDTO(user: User) {
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
    twoFactorEnabled: user.twoFactorEnabled ?? false,
  };
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

    let userId = '';
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      userId = generateUserId();
      if (!(await this.userRepository.existsById(userId))) break;
      if (i === maxAttempts - 1) throw new Error('Failed to generate unique user ID');
    }

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
      const tempToken = generateTempToken(user.id);
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
    const userId = verifyTempToken(tempToken);
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
    const isValidBackup = user.twoFactorBackupCodes
      ? this.twoFactorService.verifyBackupCode(code, user.twoFactorBackupCodes)
      : false;

    if (!isValidToken && !isValidBackup) {
      throw new InvalidCredentialsError('Invalid 2FA code');
    }

    if (isValidBackup && user.twoFactorBackupCodes) {
      const updatedCodes = this.twoFactorService.removeBackupCode(code, user.twoFactorBackupCodes);
      await this.userRepository.updateBackupCodes(user.id, updatedCodes);
    }

    const sessionToken = await this.createSession(user.id, userAgent, ipAddress);

    return { user: toUserDTO(user), sessionToken };
  }

  async logout(sessionToken: string): Promise<void> {
    const tokenHash = hashToken(sessionToken);
    await this.sessionRepository.deleteByToken(tokenHash);
  }

  async getMe(sessionToken: string): Promise<ReturnType<typeof toUserDTO>> {
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
