import { prisma } from "../../infrastructure/prisma/client.js";
import { sumsubService, SumsubApiError } from "../../services/SumsubService.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";

export const kycService = {
  async initKyc(userId: string): Promise<{ token: string; applicantId: string | null }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    if (user.kycStatus === "VERIFIED") {
      throw AppError.conflict("KYC already verified");
    }

    let applicantId: string | null = null;

    try {
      const applicant = await sumsubService.createApplicant(userId);
      applicantId = applicant.id;
      logger.info({ userId, applicantId }, "Sumsub applicant created");
    } catch (err) {
      if (err instanceof SumsubApiError && err.statusCode === 409) {
        logger.info({ userId }, "Sumsub applicant already exists, proceeding to token");
      } else {
        throw err;
      }
    }

    const { token } = await sumsubService.getAccessToken(userId);

    if (applicantId) {
      await prisma.user.update({
        where: { id: userId },
        data: { kycApplicantId: applicantId, kycStatus: "PENDING" },
      }).catch((err) => logger.error({ err, userId }, "Failed to save kycApplicantId"));
    }

    return { token, applicantId };
  },

  async handleWebhook(data: {
    applicantId: string;
    reviewStatus: string;
    reviewResult?: { reviewAnswer?: string };
  }): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { kycApplicantId: data.applicantId },
    });

    if (!user) {
      logger.warn({ applicantId: data.applicantId }, "KYC webhook: user not found");
      return;
    }

    let kycStatus: "VERIFIED" | "REJECTED" | "PENDING" = "PENDING";

    if (data.reviewStatus === "completed") {
      kycStatus = data.reviewResult?.reviewAnswer === "GREEN" ? "VERIFIED" : "REJECTED";
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { kycStatus },
    });

    logger.info(
      { userId: user.id, applicantId: data.applicantId, kycStatus },
      "KYC status updated",
    );
  },
};
