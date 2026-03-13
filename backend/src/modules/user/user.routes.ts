import type { FastifyInstance } from 'fastify';
import path from 'path';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { getUserService, getFileStorage, getAccountRepository } from '../../shared/serviceFactory.js';
import { UserController } from './user.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getProfileSchema, updateProfileSchema, uploadAvatarSchema, deleteProfileSchema, changePasswordSchema } from './user.schema.js';
import {
  updateProfileSchema as updateProfileZodSchema,
  changePasswordSchema as changePasswordZodSchema,
  deleteProfileSchema as deleteProfileZodSchema,
  verify2FASetupSchema,
  disable2FASchema,
} from './user.validation.js';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  DeleteProfileInput,
  Verify2FASetupInput,
  Disable2FAInput,
} from './user.validation.js';
import { validateBody } from '../../shared/validation/validateBody.js';
import { uploadSizeLimit } from '../../middleware/uploadLimit.js';
import { env } from '../../config/env.js';
import { RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW } from '../../config/constants.js';

export async function registerUserRoutes(app: FastifyInstance) {
  const userService = getUserService();
  const fileStorage = getFileStorage();
  const accountRepository = getAccountRepository();
  const userController = new UserController(userService, accountRepository);

  await app.register(multipart, {
    limits: { fileSize: env.MAX_UPLOAD_SIZE },
  });

  await app.register(staticPlugin, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  app.get('/api/user/profile', {
    schema: getProfileSchema,
    preHandler: [requireAuth],
  }, (request, reply) => userController.getProfile(request, reply));

  app.patch<{ Body: UpdateProfileInput }>('/api/user/profile', {
    schema: updateProfileSchema,
    preHandler: [requireAuth, validateBody(updateProfileZodSchema)],
  }, (request, reply) => userController.updateProfile(request, reply));

  app.post('/api/user/avatar', {
    schema: uploadAvatarSchema,
    preHandler: [requireAuth, uploadSizeLimit],
    config: {
      rateLimit: {
        max: RATE_LIMIT_UPLOAD_MAX,
        timeWindow: RATE_LIMIT_UPLOAD_WINDOW,
      },
    },
  }, async (request, reply) => {
    const userId = request.userId!;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'NO_FILE', message: 'No file provided' });
    }

    const buffer = await data.toBuffer();

    if (data.file.truncated) {
      return reply.status(413).send({
        error: 'FILE_TOO_LARGE',
        message: `File too large. Maximum size: ${Math.round(env.MAX_UPLOAD_SIZE / 1024)}KB`,
      });
    }

    const result = await fileStorage.saveAvatar(buffer, data.filename, userId);
    await userService.updateProfile(userId, { avatarUrl: result.url });

    return reply.send({ avatarUrl: result.url });
  });

  app.delete('/api/user/avatar', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userId = request.userId!;

    const user = await userService.getProfile(userId);
    if (user.avatarUrl) {
      await fileStorage.deleteAvatar(user.avatarUrl);
    }

    await userService.updateProfile(userId, { avatarUrl: null });

    return reply.send({ message: 'Avatar deleted successfully' });
  });

  app.delete<{ Body: DeleteProfileInput }>('/api/user/profile', {
    schema: deleteProfileSchema,
    preHandler: [requireAuth, validateBody(deleteProfileZodSchema)],
  }, (request, reply) => userController.deleteProfile(request, reply));

  app.post<{ Body: ChangePasswordInput }>('/api/user/change-password', {
    schema: changePasswordSchema,
    preHandler: [requireAuth, validateBody(changePasswordZodSchema)],
  }, (request, reply) => userController.changePassword(request, reply));

  app.get('/api/user/sessions', {
    preHandler: [requireAuth],
  }, (request, reply) => userController.getSessions(request, reply));

  app.delete<{ Params: { sessionId: string } }>('/api/user/sessions/:sessionId', {
    preHandler: [requireAuth],
  }, (request, reply) => userController.revokeSession(request, reply));

  app.delete('/api/user/sessions/others', {
    preHandler: [requireAuth],
  }, (request, reply) => userController.revokeOtherSessions(request, reply));

  app.post('/api/user/2fa/enable', {
    preHandler: [requireAuth],
  }, (request, reply) => userController.enable2FA(request, reply));

  app.post<{ Body: Verify2FASetupInput }>('/api/user/2fa/verify', {
    preHandler: [requireAuth, validateBody(verify2FASetupSchema)],
  }, (request, reply) => userController.verify2FA(request, reply));

  app.post<{ Body: Disable2FAInput }>('/api/user/2fa/disable', {
    preHandler: [requireAuth, validateBody(disable2FASchema)],
  }, (request, reply) => userController.disable2FA(request, reply));
}
