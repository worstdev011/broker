import type { FastifyInstance } from 'fastify';
import { getTradeService, getAccountService } from '../../shared/serviceFactory.js';
import { TradesController } from './trades.controller.js';
import { openTradeSchema, getTradesSchema } from './trades.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerTradesRoutes(app: FastifyInstance) {
  const tradeService = getTradeService();
  const accountService = getAccountService();
  const tradesController = new TradesController(tradeService, accountService);

  app.post<{
    Body: {
      accountId: string;
      direction: 'CALL' | 'PUT';
      amount: number;
      expirationSeconds: number;
      instrument: string;
    };
  }>('/api/trades/open', {
    schema: openTradeSchema,
    preHandler: requireAuth,
  }, (request, reply) => tradesController.openTrade(request, reply));

  app.get<{
    Querystring: { limit?: string; offset?: string; status?: 'open' | 'closed' };
  }>('/api/trades', {
    schema: getTradesSchema,
    preHandler: requireAuth,
  }, (request, reply) => tradesController.getTrades(request, reply));

  app.get('/api/trades/statistics', {
    preHandler: requireAuth,
  }, (request, reply) => tradesController.getStatistics(request, reply));

  app.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/trades/balance-history', {
    preHandler: requireAuth,
  }, (request, reply) => tradesController.getBalanceHistory(request, reply));

  app.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/trades/analytics', {
    preHandler: requireAuth,
  }, (request, reply) => tradesController.getAnalytics(request, reply));
}
