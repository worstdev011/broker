import type { FastifyInstance } from 'fastify';
import { WalletController } from './wallet.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { depositSchema, withdrawSchema, getBalanceSchema, walletWebhookSchema } from './wallet.schema.js';
import { withdrawBodySchema, depositBodySchema } from './wallet.validation.js';
import { validateBody } from '../../shared/validation/validateBody.js';
import {
  getDepositService,
  getWithdrawService,
  getAccountRepository,
  getTransactionRepository,
} from '../../shared/serviceFactory.js';

export async function registerWalletRoutes(app: FastifyInstance) {
  const walletController = new WalletController(
    getDepositService(),
    getWithdrawService(),
    getAccountRepository(),
    getTransactionRepository(),
  );

  app.post<{ Body: { amount: number } }>('/api/wallet/deposit', {
    schema: depositSchema,
    preHandler: [requireAuth, validateBody(depositBodySchema)],
  }, (request, reply) => walletController.deposit(request, reply));

  app.post<{ Body: { amount: number; cardNumber: string; twoFactorCode?: string } }>(
    '/api/wallet/withdraw',
    {
      schema: withdrawSchema,
      preHandler: [requireAuth, validateBody(withdrawBodySchema)],
    },
    (request, reply) => walletController.withdraw(request, reply),
  );

  app.post(
    '/api/wallet/webhook',
    { schema: walletWebhookSchema },
    (request, reply) => walletController.betaTransferWebhook(request, reply),
  );

  app.get('/api/wallet/balance', {
    schema: getBalanceSchema,
    preHandler: [requireAuth],
  }, (request, reply) => walletController.getBalance(request, reply));

  app.get('/api/wallet/transactions', {
    preHandler: [requireAuth],
  }, (request, reply) => walletController.getTransactions(request, reply));
}
