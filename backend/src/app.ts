import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { logger } from './shared/logger.js';
import { env } from './config/env.js';
import { registerGlobalRateLimit } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerHealthRoutes } from './modules/health/health.routes.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerAccountsRoutes } from './modules/accounts/accounts.routes.js';
import { registerTradesRoutes } from './modules/trades/trades.routes.js';
import { registerTerminalRoutes } from './modules/terminal/terminal.routes.js';
import { registerLineChartRoutes } from './modules/linechart/linechart.routes.js';
import { registerUserRoutes } from './modules/user/user.routes.js';
import { registerWalletRoutes } from './modules/wallet/wallet.routes.js';
import { registerInstrumentsRoutes } from './modules/instruments/instruments.routes.js';
import { registerKycRoutes } from './modules/kyc/kyc.routes.js';

const CSRF_SKIP_PATHS = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/2fa',
  '/api/auth/logout',
  '/api/kyc/webhook',
]);

export async function createApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      return (req.headers['x-request-id'] as string) || randomUUID();
    },
  });

  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-ID', request.id);
  });

  app.setErrorHandler(errorHandler);

  await app.register(fastifyCors, {
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'csrf-token'],
    exposedHeaders: ['Content-Type', 'X-Request-ID'],
  });

  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
  });

  await app.register(fastifyCsrfProtection, {
    cookieOpts: {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      signed: true,
    },
    getToken: (req) => (req.headers['csrf-token'] as string) || undefined,
  });

  app.addHook('onRequest', async (request, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    if (request.url === '/health') return;

    const pathname = request.url.split('?')[0] ?? '';
    if (pathname && CSRF_SKIP_PATHS.has(pathname)) return;

    return new Promise<void>((resolve, reject) => {
      app.csrfProtection(request, reply, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Comfortrade API',
        description: 'Binary options trading platform API',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Authentication' },
        { name: 'accounts', description: 'Trading accounts' },
        { name: 'trades', description: 'Trades' },
        { name: 'user', description: 'User profile' },
        { name: 'wallet', description: 'Wallet & balance' },
        { name: 'instruments', description: 'Instruments & payouts' },
        { name: 'terminal', description: 'Terminal snapshot' },
        { name: 'linechart', description: 'Line chart data' },
        { name: 'kyc', description: 'KYC / identity verification (Sumsub)' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  await app.register(fastifyHelmet, (instance) => {
    const csp = instance.swaggerCSP ?? { script: [], style: [] };
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'].concat(csp.style),
          scriptSrc: ["'self'"].concat(csp.script),
          imgSrc: ["'self'", 'data:', 'https:', 'validator.swagger.io'],
          formAction: ["'self'"],
        },
      },
    };
  });

  await registerGlobalRateLimit(app);

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerAccountsRoutes(app);
  await registerTradesRoutes(app);
  await registerTerminalRoutes(app);
  await registerLineChartRoutes(app);
  await registerUserRoutes(app);
  await registerWalletRoutes(app);
  await registerInstrumentsRoutes(app);
  await registerKycRoutes(app);

  logger.info('Fastify application created');

  return app;
}
