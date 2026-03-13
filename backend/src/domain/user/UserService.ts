import type { UserRepository, UpdateProfileData } from '../../ports/repositories/UserRepository.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { User, Session } from '../auth/AuthTypes.js';
import { verifyPassword, hashPassword } from '../../utils/crypto.js';
import { logger } from '../../shared/logger.js';
import { TwoFactorService } from './TwoFactorService.js';
import {
  UserNotFoundError,
  NicknameAlreadyTakenError,
  PhoneAlreadyTakenError,
  InvalidPasswordError,
  UserSessionNotFoundError,
  ForbiddenError,
  InvalidDateOfBirthError,
  PasswordPolicyError,
  TwoFactorError,
  CurrencyAlreadySetError,
} from './UserErrors.js';

export class UserService {
  private twoFactorService: TwoFactorService;

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
  ) {
    this.twoFactorService = new TwoFactorService();
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    const { password, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new UserNotFoundError(userId);
    }

    if (data.nickname !== undefined && data.nickname !== existingUser.nickname) {
      if (data.nickname !== null && data.nickname !== '') {
        const userWithNickname = await this.userRepository.findByNickname(data.nickname);
        if (userWithNickname && userWithNickname.id !== userId) {
          throw new NicknameAlreadyTakenError(data.nickname);
        }
      }
    }

    if (data.currency !== undefined && existingUser.currency) {
      throw new CurrencyAlreadySetError();
    }

    if (data.phone !== undefined && data.phone !== existingUser.phone) {
      if (data.phone !== null && data.phone !== '') {
        const userWithPhone = await this.userRepository.findByPhone(data.phone);
        if (userWithPhone && userWithPhone.id !== userId) {
          throw new PhoneAlreadyTakenError(data.phone);
        }
      }
    }

    if (data.dateOfBirth !== undefined && data.dateOfBirth !== null) {
      if (data.dateOfBirth.getTime() > Date.now()) {
        throw new InvalidDateOfBirthError('Date of birth cannot be in the future');
      }
      const ageInMs = Date.now() - data.dateOfBirth.getTime();
      const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
      if (ageInYears < 18) {
        throw new InvalidDateOfBirthError('User must be at least 18 years old');
      }
    }

    const updatedUser = await this.userRepository.updateProfile(userId, data);
    const { password, ...profile } = updatedUser;
    return profile;
  }

  async deleteProfile(userId: string, password: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new InvalidPasswordError();
    }

    await this.sessionRepository.deleteAllByUserId(userId);
    await this.userRepository.deleteById(userId);
  }

  async changePassword({
    userId,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new InvalidPasswordError('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new PasswordPolicyError('New password must be different from current password');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, newPasswordHash);

    logger.info(`Password changed for user: ${userId}`);
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.findAllByUserId(userId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new UserSessionNotFoundError(sessionId);
    }
    if (session.userId !== userId) {
      throw new ForbiddenError('You can only revoke your own sessions');
    }

    await this.sessionRepository.deleteById(sessionId);
    logger.info(`Session ${sessionId} revoked by user ${userId}`);
  }

  async revokeOtherSessions(userId: string, currentTokenHash: string): Promise<void> {
    await this.sessionRepository.deleteAllExcept(userId, currentTokenHash);
    logger.info(`All other sessions revoked for user ${userId}`);
  }

  async enable2FA(userId: string, email: string): Promise<{ qrCode: string; backupCodes: string[] }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const secret = this.twoFactorService.generateSecret();
    const qrCode = await this.twoFactorService.generateQRCode(email, secret);

    const backupCodes = this.twoFactorService.generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map((code) =>
      this.twoFactorService.hashBackupCode(code),
    );

    await this.userRepository.updateTwoFactorSecret(userId, secret);
    await this.userRepository.updateBackupCodes(userId, hashedBackupCodes);

    logger.info(`2FA setup initiated for user ${userId}`);

    return { qrCode, backupCodes };
  }

  async verify2FA(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.twoFactorSecret) {
      throw new TwoFactorError('2FA not initialized. Please enable 2FA first.');
    }

    const isValid = await this.twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new TwoFactorError('Invalid 2FA code');
    }

    await this.userRepository.enableTwoFactor(userId, user.twoFactorBackupCodes || []);
    logger.info(`2FA enabled for user ${userId}`);
  }

  async disable2FA(userId: string, password: string, token: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new InvalidPasswordError('Invalid password');
    }

    if (!user.twoFactorSecret) {
      throw new TwoFactorError('2FA is not enabled');
    }

    const isValidToken = await this.twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isValidToken) {
      throw new TwoFactorError('Invalid 2FA code');
    }

    await this.userRepository.disableTwoFactor(userId);
    logger.info(`2FA disabled for user ${userId}`);
  }
}
