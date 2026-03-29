import type { FastifyRequest, FastifyReply } from "fastify";
import { kycService } from "../../domain/kyc/kyc.service.js";
import { sumsubService } from "../../services/SumsubService.js";
import { logger } from "../../shared/logger.js";
import { AppError } from "../../shared/errors/AppError.js";

export const kycController = {
  async init(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const result = await kycService.initKyc(userId);
    return reply.status(201).send(result);
  },

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const rawBody = (request as any).rawBody as Buffer | undefined;
    const signature = (request.headers["x-payload-digest"] as string) ?? "";

    if (!rawBody || rawBody.length === 0 || !signature || !sumsubService.verifyWebhookSignature(rawBody, signature)) {
      logger.warn({ ip: request.ip }, "KYC webhook: invalid HMAC signature");
      throw AppError.unauthorized("Invalid signature");
    }

    const body = request.body as {
      applicantId?: string;
      reviewStatus?: string;
      reviewResult?: { reviewAnswer?: string };
    };

    if (!body.applicantId) {
      logger.warn("KYC webhook: missing applicantId");
      return reply.send({ ok: true });
    }

    logger.info(
      { applicantId: body.applicantId, reviewStatus: body.reviewStatus },
      "KYC webhook received",
    );

    await kycService.handleWebhook({
      applicantId: body.applicantId,
      reviewStatus: body.reviewStatus ?? "",
      reviewResult: body.reviewResult,
    });

    return reply.send({ ok: true });
  },
};
