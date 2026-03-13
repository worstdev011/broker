import type { FastifyInstance } from 'fastify';
import { InstrumentsController } from './instruments.controller.js';
import { getInstrumentsSchema, updatePayoutSchema } from './instruments.schema.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';

export async function registerInstrumentsRoutes(app: FastifyInstance) {
  const controller = new InstrumentsController();

  app.get(
    '/api/instruments',
    { schema: getInstrumentsSchema },
    (request, reply) => controller.getInstruments(request, reply),
  );

  app.patch<{ Params: { id: string }; Body: { payoutPercent: number } }>(
    '/api/instruments/:id/payout',
    { schema: updatePayoutSchema, preHandler: [requireAuth, requireAdmin] },
    (request, reply) => controller.updatePayout(request, reply),
  );
}
