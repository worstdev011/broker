import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../../domain/user/UserService.js';
import { hashToken } from '../../utils/crypto.js';
import { getSessionToken, clearSessionCookie } from '../../infrastructure/auth/CookieAuthAdapter.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  DeleteProfileInput,
  Verify2FASetupInput,
  Disable2FAInput,
} from './user.validation.js';

export class UserController {
  constructor(
    private userService: UserService,
    private accountRepository?: AccountRepository,
  ) {}

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const profile = await this.userService.getProfile(userId);

    if (profile.currency && this.accountRepository) {
      const activeAccount = await this.accountRepository.findActiveByUserId(userId);
      if (activeAccount && activeAccount.currency !== profile.currency) {
        await this.accountRepository.updateCurrencyByUserId(userId, profile.currency);
      }
    }

    return reply.send({ user: profile });
  }

  async updateProfile(
    request: FastifyRequest<{ Body: UpdateProfileInput }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const body = request.body;

    const updateData: {
      firstName?: string | null;
      lastName?: string | null;
      nickname?: string | null;
      phone?: string | null;
      country?: string | null;
      currency?: string | null;
      dateOfBirth?: Date | null;
      avatarUrl?: string | null;
    } = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName || null;
    if (body.lastName !== undefined) updateData.lastName = body.lastName || null;
    if (body.nickname !== undefined) updateData.nickname = body.nickname || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.country !== undefined) updateData.country = body.country || null;
    if (body.currency !== undefined) updateData.currency = body.currency || null;
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl || null;

    const profile = await this.userService.updateProfile(userId, updateData);

    if (body.currency && this.accountRepository) {
      await this.accountRepository.updateCurrencyByUserId(userId, body.currency);
    }

    return reply.send({ user: profile });
  }

  async deleteProfile(
    request: FastifyRequest<{ Body: DeleteProfileInput }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { password } = request.body;

    await this.userService.deleteProfile(userId, password);
    clearSessionCookie(reply);

    return reply.send({ message: 'User profile deleted successfully' });
  }

  async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordInput }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { currentPassword, newPassword } = request.body;

    await this.userService.changePassword({ userId, currentPassword, newPassword });

    return reply.send({ message: 'Password changed successfully' });
  }

  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const sessions = await this.userService.getUserSessions(userId);
    return reply.send({ sessions });
  }

  async revokeSession(
    request: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { sessionId } = request.params;

    await this.userService.revokeSession(userId, sessionId);

    return reply.send({ message: 'Session revoked successfully' });
  }

  async revokeOtherSessions(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const sessionToken = getSessionToken(request);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'NOT_AUTHENTICATED', message: 'Not authenticated' });
    }

    const currentTokenHash = hashToken(sessionToken);
    await this.userService.revokeOtherSessions(userId, currentTokenHash);

    return reply.send({ message: 'All other sessions revoked successfully' });
  }

  async enable2FA(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const profile = await this.userService.getProfile(userId);
    const result = await this.userService.enable2FA(userId, profile.email);

    return reply.send({ qrCode: result.qrCode, backupCodes: result.backupCodes });
  }

  async verify2FA(
    request: FastifyRequest<{ Body: Verify2FASetupInput }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { code } = request.body;

    await this.userService.verify2FA(userId, code);

    return reply.send({ success: true, message: '2FA enabled successfully' });
  }

  async disable2FA(
    request: FastifyRequest<{ Body: Disable2FAInput }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { password, code } = request.body;

    await this.userService.disable2FA(userId, password, code);

    return reply.send({ success: true, message: '2FA disabled successfully' });
  }
}
