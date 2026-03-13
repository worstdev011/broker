/**
 * KYC routes.
 *
 * /api/kyc/init    — create applicant + issue WebSDK token (CSRF-protected, auth optional)
 * /api/kyc/webhook — receive Sumsub review events (CSRF skipped, raw body captured for HMAC)
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { KycController } from './kyc.controller.js';
import { kycInitSchema, kycWebhookSchema } from './kyc.schema.js';

const controller = new KycController();

export async function registerKycRoutes(app: FastifyInstance) {
  // ── /api/kyc/init ─────────────────────────────────────────────────
  // Normal JSON parsing; CSRF protection applies (user-initiated from browser).
  app.post<{ Body: { userId: string } }>(
    '/api/kyc/init',
    { schema: kycInitSchema },
    (req, reply) => controller.init(req, reply),
  );

  // ── /api/kyc/webhook ──────────────────────────────────────────────
  // Register in a scoped sub-plugin so we can install a custom content-type
  // parser that also stashes the raw Buffer on req.raw for HMAC verification.
  // CSRF is skipped in app.ts CSRF_SKIP_PATHS.
  await app.register(async (webhookScope: FastifyInstance) => {
    webhookScope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (req: FastifyRequest, body: Buffer, done) => {
        // Store raw bytes on the underlying Node IncomingMessage so the
        // controller can access them after Fastify has already parsed the JSON.
        (req.raw as Record<string, unknown>)['rawBody'] = body;
        try {
          done(null, JSON.parse(body.toString('utf8')));
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    webhookScope.post(
      '/api/kyc/webhook',
      { schema: kycWebhookSchema },
      (req, reply) => controller.webhook(req, reply),
    );
  });
}
