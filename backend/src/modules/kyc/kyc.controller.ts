import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  createApplicant,
  getAccessToken,
  verifyWebhookSignature,
  SumsubApiError,
} from '../../services/sumsub.js';
import { logger } from '../../shared/logger.js';
import { getPrismaClient } from '../../bootstrap/database.js';

const kycLog = logger.child({ module: 'kyc' });

interface KycInitBody {
  userId: string;
}

interface SumsubWebhookPayload {
  type?: string;
  applicantId?: string;
  externalUserId?: string;
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer?: string;
    rejectLabels?: string[];
    clientComment?: string;
    moderationComment?: string;
  };
}

export class KycController {
  /**
   * POST /api/kyc/init
   *
   * 1. Creates a Sumsub applicant (idempotent — ignores 409 duplicate).
   * 2. Issues a WebSDK access token for the applicant.
   * 3. Returns { token, applicantId } to the client.
   */
  async init(
    request: FastifyRequest<{ Body: KycInitBody }>,
    reply: FastifyReply,
  ) {
    const { userId } = request.body;

    let applicantId: string | undefined;

    try {
      const applicant = await createApplicant(userId);
      applicantId = applicant.id;
      kycLog.info({ userId, applicantId }, 'Sumsub applicant created');
    } catch (err) {
      if (err instanceof SumsubApiError && err.statusCode === 409) {
        kycLog.info({ userId }, 'Sumsub applicant already exists, proceeding to token');
      } else {
        kycLog.error({ userId, err }, 'Failed to create Sumsub applicant');
        throw err;
      }
    }

    const { token } = await getAccessToken(userId);
    kycLog.info({ userId, applicantId }, 'Sumsub access token issued');

    if (applicantId) {
      const db = getPrismaClient();
      await db.user.update({
        where: { id: userId },
        data: { kycApplicantId: applicantId, kycStatus: 'pending' },
      }).catch(err => kycLog.error({ err, userId }, 'Failed to save kycApplicantId'));
    }

    return reply.send({ token, applicantId: applicantId ?? null });
  }

  /**
   * POST /api/kyc/webhook
   *
   * Verifies X-Payload-Digest HMAC and handles applicantReviewed events.
   * The raw request body must be stored in request.raw as `rawBody` before
   * this handler is called (done in kyc.routes.ts content type parser).
   */
  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const digest = (request.headers['x-payload-digest'] as string | undefined) ?? '';

    const rawBody: Buffer | undefined = (request.raw as Record<string, unknown>)[
      'rawBody'
    ] as Buffer | undefined;

    if (!rawBody) {
      kycLog.warn('Webhook received without rawBody — signature cannot be verified');
      return reply.status(400).send({ error: 'MISSING_RAW_BODY' });
    }

    if (!verifyWebhookSignature(rawBody, digest)) {
      kycLog.warn({ digest }, 'Invalid Sumsub webhook signature');
      return reply.status(403).send({ error: 'INVALID_SIGNATURE' });
    }

    const event = request.body as SumsubWebhookPayload;
    const { type, applicantId, externalUserId, reviewResult } = event;

    kycLog.info({ type, applicantId, externalUserId }, 'Sumsub webhook received');

    if (externalUserId) {
      const db = getPrismaClient();

      if (type === 'applicantReviewed') {
        const answer = reviewResult?.reviewAnswer;
        let kycStatus: string | null = null;

        if (answer === 'GREEN') {
          kycStatus = 'verified';
          kycLog.info({ applicantId, externalUserId }, 'KYC APPROVED — applicant passed verification');
        } else if (answer === 'RED') {
          kycStatus = 'rejected';
          kycLog.warn(
            {
              applicantId,
              externalUserId,
              rejectLabels: reviewResult?.rejectLabels,
              clientComment: reviewResult?.clientComment,
            },
            'KYC REJECTED — applicant failed verification',
          );
        } else {
          kycLog.info({ applicantId, externalUserId, answer }, 'KYC review completed with unknown answer');
        }

        if (kycStatus) {
          await db.user.update({
            where: { id: externalUserId },
            data: {
              kycStatus,
              ...(applicantId ? { kycApplicantId: applicantId } : {}),
            },
          }).catch(err => kycLog.error({ err, externalUserId }, 'Failed to persist kycStatus'));
        }
      } else if (type === 'applicantPending' || type === 'applicantOnHold') {
        await db.user.update({
          where: { id: externalUserId },
          data: { kycStatus: 'pending' },
        }).catch(err => kycLog.error({ err, externalUserId }, 'Failed to set kycStatus pending'));
      }
    }

    return reply.status(200).send({ ok: true });
  }
}
