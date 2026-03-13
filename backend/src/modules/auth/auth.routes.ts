import type { FastifyInstance } from 'fastify';
import { getAuthService } from '../../shared/serviceFactory.js';
import { AuthController } from './auth.controller.js';
import { registerSchema, loginSchema, logoutSchema, meSchema } from './auth.schema.js';
import { registerSchema as registerZodSchema, loginSchema as loginZodSchema, verify2FASchema } from './auth.validation.js';
import type { RegisterInput, LoginInput, Verify2FAInput } from './auth.validation.js';
import { validateBody } from '../../shared/validation/validateBody.js';
import {
  RATE_LIMIT_AUTH_LOGIN_MAX,
  RATE_LIMIT_AUTH_LOGIN_WINDOW,
  RATE_LIMIT_AUTH_REGISTER_MAX,
  RATE_LIMIT_AUTH_REGISTER_WINDOW,
  RATE_LIMIT_AUTH_2FA_MAX,
  RATE_LIMIT_AUTH_2FA_WINDOW,
} from '../../config/constants.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  const authService = getAuthService();
  const authController = new AuthController(authService);

  app.get('/api/auth/csrf', async (_request, reply) => {
    const token = reply.generateCsrf();
    return { csrfToken: token };
  });

  app.post<{ Body: RegisterInput }>('/api/auth/register', {
    schema: registerSchema,
    preHandler: [validateBody(registerZodSchema)],
    config: {
      rateLimit: {
        max: RATE_LIMIT_AUTH_REGISTER_MAX,
        timeWindow: RATE_LIMIT_AUTH_REGISTER_WINDOW,
      },
    },
  }, (request, reply) => authController.register(request, reply));

  app.post<{ Body: LoginInput }>('/api/auth/login', {
    schema: loginSchema,
    preHandler: [validateBody(loginZodSchema)],
    config: {
      rateLimit: {
        max: RATE_LIMIT_AUTH_LOGIN_MAX,
        timeWindow: RATE_LIMIT_AUTH_LOGIN_WINDOW,
      },
    },
  }, (request, reply) => authController.login(request, reply));

  app.post('/api/auth/logout', {
    schema: logoutSchema,
  }, (request, reply) => authController.logout(request, reply));

  app.get('/api/auth/me', {
    schema: meSchema,
  }, (request, reply) => authController.me(request, reply));

  app.post<{ Body: Verify2FAInput }>('/api/auth/2fa', {
    preHandler: [validateBody(verify2FASchema)],
    config: {
      rateLimit: {
        max: RATE_LIMIT_AUTH_2FA_MAX,
        timeWindow: RATE_LIMIT_AUTH_2FA_WINDOW,
      },
    },
  }, (request, reply) => authController.verifyLogin2FA(request, reply));
}
