import type { FastifyInstance } from 'fastify';
import { getAccountService } from '../../shared/serviceFactory.js';
import { AccountsController } from './accounts.controller.js';
import { getAccountsSchema, createAccountSchema, switchAccountSchema, resetDemoAccountSchema, getAccountSnapshotSchema } from './accounts.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerAccountsRoutes(app: FastifyInstance) {
  const accountService = getAccountService();
  const accountsController = new AccountsController(accountService);

  app.get('/api/accounts', {
    schema: getAccountsSchema,
    preHandler: requireAuth,
  }, (request, reply) => accountsController.getAccounts(request, reply));

  app.post<{ Body: { type: 'demo' | 'real' } }>('/api/accounts/create', {
    schema: createAccountSchema,
    preHandler: requireAuth,
  }, (request, reply) => accountsController.createAccount(request, reply));

  app.post<{ Body: { accountId: string } }>('/api/accounts/switch', {
    schema: switchAccountSchema,
    preHandler: requireAuth,
  }, (request, reply) => accountsController.switchAccount(request, reply));

  app.post('/api/accounts/demo/reset', {
    schema: resetDemoAccountSchema,
    preHandler: requireAuth,
  }, (request, reply) => accountsController.resetDemoAccount(request, reply));

  app.get('/api/account/snapshot', {
    schema: getAccountSnapshotSchema,
    preHandler: requireAuth,
  }, (request, reply) => accountsController.getAccountSnapshot(request, reply));
}
