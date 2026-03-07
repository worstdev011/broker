/**
 * User routes
 * FLOW U1: Base Profile endpoints
 */

import type { FastifyInstance } from 'fastify';
import path from 'path';
import { UserService } from '../../domain/user/UserService.js';
import { PrismaUserRepository } from '../../infrastructure/prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from '../../infrastructure/prisma/PrismaSessionRepository.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { UserController } from './user.controller.js';
import { FileStorage } from '../../infrastructure/storage/FileStorage.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getProfileSchema, updateProfileSchema, uploadAvatarSchema, deleteProfileSchema, changePasswordSchema } from './user.schema.js';
import {
  updateProfileSchema as updateProfileZodSchema,
  changePasswordSchema as changePasswordZodSchema,
  deleteProfileSchema as deleteProfileZodSchema,
  verify2FASetupSchema,
  disable2FASchema,
} from './user.validation.js';
import { validateBody } from '../../shared/validation/validateBody.js';
import { uploadSizeLimit } from '../../middleware/uploadLimit.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';
import { RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW } from '../../config/constants.js';

export async function registerUserRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const userRepository = new PrismaUserRepository();
  const sessionRepository = new PrismaSessionRepository();
  const accountRepository = new PrismaAccountRepository();
  const userService = new UserService(userRepository, sessionRepository);
  const userController = new UserController(userService, accountRepository);
  const fileStorage = new FileStorage();

  // Register multipart plugin for file uploads
  // Note: Install with: npm install @fastify/multipart
  try {
    const multipart = await import('@fastify/multipart');
    const plugin = multipart.default || multipart;
    await app.register(plugin, {
      limits: { fileSize: env.MAX_UPLOAD_SIZE },
    });
  } catch (error) {
    logger.warn('Multipart plugin not available. Install @fastify/multipart for avatar uploads.');
  }

  // Register static file serving for avatars
  // Note: Install with: npm install @fastify/static
  try {
    const staticPlugin = await import('@fastify/static');
    const plugin = staticPlugin.default || staticPlugin;
    await app.register(plugin, {
      root: path.join(process.cwd(), 'uploads'),
      prefix: '/uploads/',
    });
  } catch (error) {
    logger.warn('Static plugin not available. Install @fastify/static for serving avatar files.');
  }

  // GET /api/user/profile
  app.get(
    '/api/user/profile',
    {
      schema: getProfileSchema,
      preHandler: [requireAuth],
    },
    (request, reply) => userController.getProfile(request, reply),
  );

  // PATCH /api/user/profile
  app.patch(
    '/api/user/profile',
    {
      schema: updateProfileSchema,
      preHandler: [requireAuth, validateBody(updateProfileZodSchema)],
    },
    (request, reply) => userController.updateProfile(request as any, reply),
  );

  // POST /api/user/avatar
  app.post(
    '/api/user/avatar',
    {
      schema: uploadAvatarSchema,
      preHandler: [requireAuth, uploadSizeLimit],
      config: {
        rateLimit: {
          max: RATE_LIMIT_UPLOAD_MAX,
          timeWindow: RATE_LIMIT_UPLOAD_WINDOW,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({
            error: 'Not authenticated',
          });
        }

        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            error: 'No file provided',
          });
        }

        // Read file buffer
        const buffer = await data.toBuffer();

        // Check if file was truncated (exceeds MAX_UPLOAD_SIZE)
        if (data.file.truncated) {
          return reply.status(413).send({
            error: `File too large. Maximum size: ${Math.round(env.MAX_UPLOAD_SIZE / 1024)}KB`,
          });
        }

        // Save avatar
        const result = await fileStorage.saveAvatar(buffer, data.filename, userId);

        // Update user profile with avatar URL
        await userService.updateProfile(userId, {
          avatarUrl: result.url,
        });

        return reply.send({
          avatarUrl: result.url,
        });
      } catch (error) {
        logger.error('Upload avatar error:', error);
        if (error instanceof Error) {
          return reply.status(400).send({
            error: error.message,
          });
        }
        return reply.status(500).send({
          error: 'Internal server error',
        });
      }
    },
  );

  // DELETE /api/user/avatar
  app.delete(
    '/api/user/avatar',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({
            error: 'Not authenticated',
          });
        }

        // Get current user to find avatar URL
        const user = await userService.getProfile(userId);
        if (user.avatarUrl) {
          // Delete file
          await fileStorage.deleteAvatar(user.avatarUrl);
        }

        // Update user profile (remove avatarUrl)
        await userService.updateProfile(userId, {
          avatarUrl: null,
        });

        return reply.send({
          message: 'Avatar deleted successfully',
        });
      } catch (error) {
        logger.error('Delete avatar error:', error);
        return reply.status(500).send({
          error: 'Internal server error',
        });
      }
    },
  );

  // 🔥 FLOW U1.9: DELETE /api/user/profile
  app.delete(
    '/api/user/profile',
    {
      schema: deleteProfileSchema,
      preHandler: [requireAuth, validateBody(deleteProfileZodSchema)],
    },
    (request, reply) => userController.deleteProfile(request as any, reply),
  );

  // 🔥 FLOW U2: POST /api/user/change-password
  app.post(
    '/api/user/change-password',
    {
      schema: changePasswordSchema,
      preHandler: [requireAuth, validateBody(changePasswordZodSchema)],
    },
    (request, reply) => userController.changePassword(request as any, reply),
  );

  // 🔥 FLOW S1: GET /api/user/sessions
  app.get(
    '/api/user/sessions',
    {
      preHandler: [requireAuth],
    },
    (request, reply) => userController.getSessions(request, reply),
  );

  // 🔥 FLOW S1: DELETE /api/user/sessions/:sessionId
  app.delete(
    '/api/user/sessions/:sessionId',
    {
      preHandler: [requireAuth],
    },
    (request, reply) => userController.revokeSession(request as any, reply),
  );

  // 🔥 FLOW S2: DELETE /api/user/sessions/others
  app.delete(
    '/api/user/sessions/others',
    {
      preHandler: [requireAuth],
    },
    (request, reply) => userController.revokeOtherSessions(request, reply),
  );

  // 🔥 FLOW S3: POST /api/user/2fa/enable
  app.post(
    '/api/user/2fa/enable',
    {
      preHandler: [requireAuth],
    },
    (request, reply) => userController.enable2FA(request, reply),
  );

  // 🔥 FLOW S3: POST /api/user/2fa/verify
  app.post(
    '/api/user/2fa/verify',
    {
      preHandler: [requireAuth, validateBody(verify2FASetupSchema)],
    },
    (request, reply) => userController.verify2FA(request as any, reply),
  );

  // 🔥 FLOW S3: POST /api/user/2fa/disable
  app.post(
    '/api/user/2fa/disable',
    {
      preHandler: [requireAuth, validateBody(disable2FASchema)],
    },
    (request, reply) => userController.disable2FA(request as any, reply),
  );
}
