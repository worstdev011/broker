import type { FastifyInstance } from 'fastify';
import { WalletController } from './wallet.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { depositSchema, withdrawSchema, getBalanceSchema } from './wallet.schema.js';
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

  app.post<{ Body: { amount: number; paymentMethod: string } }>('/api/wallet/deposit', {
    schema: depositSchema,
    preHandler: [requireAuth],
  }, (request, reply) => walletController.deposit(request, reply));

  app.post<{ Body: { amount: number; paymentMethod: string } }>('/api/wallet/withdraw', {
    schema: withdrawSchema,
    preHandler: [requireAuth],
  }, (request, reply) => walletController.withdraw(request, reply));

  app.get('/api/wallet/balance', {
    schema: getBalanceSchema,
    preHandler: [requireAuth],
  }, (request, reply) => walletController.getBalance(request, reply));

  app.get('/api/wallet/transactions', {
    preHandler: [requireAuth],
  }, (request, reply) => walletController.getTransactions(request, reply));
}
