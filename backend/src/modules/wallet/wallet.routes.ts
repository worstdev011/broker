/**
 * Wallet routes
 * 🔥 FLOW W1: Deposit endpoints
 */

import type { FastifyInstance } from 'fastify';
import { WalletController } from './wallet.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { depositSchema, withdrawSchema, getBalanceSchema } from './wallet.schema.js';

export async function registerWalletRoutes(app: FastifyInstance) {
  const walletController = new WalletController();

  // POST /api/wallet/deposit
  app.post(
    '/api/wallet/deposit',
    {
      schema: depositSchema,
      preHandler: [requireAuth],
    },
    (request, reply) => walletController.deposit(request as any, reply),
  );

  // POST /api/wallet/withdraw
  app.post(
    '/api/wallet/withdraw',
    { schema: withdrawSchema, preHandler: [requireAuth] },
    (request, reply) => walletController.withdraw(request as any, reply),
  );

  // GET /api/wallet/balance
  app.get(
    '/api/wallet/balance',
    {
      schema: getBalanceSchema,
      preHandler: [requireAuth],
    },
    (request, reply) => walletController.getBalance(request, reply),
  );

  // GET /api/wallet/transactions
  app.get(
    '/api/wallet/transactions',
    { preHandler: [requireAuth] },
    (request, reply) => walletController.getTransactions(request, reply),
  );
}
