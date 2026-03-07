/**
 * FLOW LP-2: LineChart routes
 */

import type { FastifyInstance } from 'fastify';
import { LineChartController } from './linechart.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerLineChartRoutes(app: FastifyInstance) {
  const controller = new LineChartController();

  app.get(
    '/api/line/snapshot',
    {
      preHandler: requireAuth,
    },
    (request, reply) => controller.getSnapshot(request as any, reply),
  );

  app.get(
    '/api/line/history',
    {
      preHandler: requireAuth,
    },
    (request, reply) => controller.getHistory(request as any, reply),
  );
}
