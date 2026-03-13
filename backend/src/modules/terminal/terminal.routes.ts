import type { FastifyInstance } from 'fastify';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { getTerminalSnapshotService } from '../../shared/serviceFactory.js';
import { TerminalController } from './terminal.controller.js';
import { getSnapshotSchema } from './terminal.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerTerminalRoutes(app: FastifyInstance) {
  const snapshotService = getTerminalSnapshotService();
  const controller = new TerminalController(snapshotService, () => getPriceEngineManager());

  app.get<{ Querystring: { instrument?: string } }>(
    '/api/terminal/snapshot',
    { schema: getSnapshotSchema, preHandler: requireAuth },
    (request, reply) => controller.getSnapshot(request, reply),
  );

  app.get<{ Querystring: { instrument?: string; timeframe?: string; to?: string; limit?: string } }>(
    '/api/quotes/candles',
    { preHandler: requireAuth },
    (request, reply) => controller.getCandles(request, reply),
  );
}
