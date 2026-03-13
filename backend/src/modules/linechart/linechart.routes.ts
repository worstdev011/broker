import type { FastifyInstance } from 'fastify';
import { LineChartController } from './linechart.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerLineChartRoutes(app: FastifyInstance) {
  const controller = new LineChartController();

  app.get<{ Querystring: { symbol?: string } }>(
    '/api/line/snapshot',
    { preHandler: requireAuth },
    (request, reply) => controller.getSnapshot(request, reply),
  );

  app.get<{ Querystring: { symbol?: string; to?: string; limit?: string } }>(
    '/api/line/history',
    { preHandler: requireAuth },
    (request, reply) => controller.getHistory(request, reply),
  );
}
