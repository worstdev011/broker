/**
 * Trades routes
 */

import type { FastifyInstance } from 'fastify';
import { TradeService } from '../../domain/trades/TradeService.js';
import { PrismaTradeRepository } from '../../infrastructure/prisma/PrismaTradeRepository.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from '../../infrastructure/prisma/PrismaTransactionRepository.js';
import { PrismaInstrumentRepository } from '../../infrastructure/prisma/PrismaInstrumentRepository.js';
import { PriceServiceAdapter } from '../../infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { TradesController } from './trades.controller.js';
import { openTradeSchema, getTradesSchema } from './trades.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { AccountService } from '../../domain/accounts/AccountService.js';

export async function registerTradesRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const tradeRepository = new PrismaTradeRepository();
  const accountRepository = new PrismaAccountRepository();
  const transactionRepository = new PrismaTransactionRepository();
  
  // Create lazy price provider wrapper
  // This will be initialized when first used (after bootstrap)
  let priceProvider: PriceServiceAdapter | null = null;
  const getPriceProvider = (): PriceServiceAdapter => {
    if (!priceProvider) {
      const manager = getPriceEngineManager();
      priceProvider = new PriceServiceAdapter(manager);
    }
    return priceProvider;
  };

  // Create price provider that uses lazy initialization
  const lazyPriceProvider: import('../../ports/pricing/PriceProvider.js').PriceProvider = {
    getCurrentPrice: async (asset: string) => {
      return getPriceProvider().getCurrentPrice(asset);
    },
  };

  const instrumentRepository = new PrismaInstrumentRepository();
  const tradeService = new TradeService(tradeRepository, accountRepository, lazyPriceProvider, transactionRepository, instrumentRepository);
  const accountService = new AccountService(accountRepository, transactionRepository);
  const tradesController = new TradesController(tradeService, accountService);

  // Register routes with auth middleware
  app.post(
    '/api/trades/open',
    {
      schema: openTradeSchema,
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.openTrade(request as any, reply),
  );

  app.get(
    '/api/trades',
    {
      schema: getTradesSchema,
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.getTrades(request as any, reply),
  );

  // 🔥 FLOW TRADE-STATS: GET /api/trades/statistics
  app.get(
    '/api/trades/statistics',
    {
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.getStatistics(request, reply),
  );

  // 🔥 FLOW TRADE-STATS: GET /api/trades/balance-history?days=30
  app.get(
    '/api/trades/balance-history',
    {
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.getBalanceHistory(request as any, reply),
  );

  // GET /api/trades/analytics?startDate=&endDate=
  app.get(
    '/api/trades/analytics',
    {
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.getAnalytics(request as any, reply),
  );
}
