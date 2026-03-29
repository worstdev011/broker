import { accountRepository } from "../../infrastructure/prisma/account.repository.js";
import { betaTransferService } from "../../services/BetaTransferService.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { toTransactionDTO, type TransactionDTO } from "../../shared/dto/transaction.dto.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";
import { verify as verifyTotp } from "otplib";

const MIN_WITHDRAWAL = 10;
const MAX_WITHDRAWAL = 50_000;

export const withdrawService = {
  async initiateWithdrawal(data: {
    userId: string;
    accountId: string;
    amount: number;
    currency: string;
    cardNumber: string;
    twoFactorCode?: string;
  }): Promise<{ transaction: TransactionDTO }> {
    if (data.amount < MIN_WITHDRAWAL || data.amount > MAX_WITHDRAWAL) {
      throw AppError.badRequest(`Withdrawal amount must be between ${MIN_WITHDRAWAL} and ${MAX_WITHDRAWAL}`);
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: data.userId } });

    if (user.kycStatus !== "VERIFIED") {
      throw AppError.forbidden("KYC verification required for withdrawals");
    }

    if (user.twoFactorEnabled) {
      if (!data.twoFactorCode) {
        throw AppError.badRequest("2FA code is required");
      }
      const result = verifyTotp({ token: data.twoFactorCode, secret: user.twoFactorSecret! });
      if (!result) {
        throw AppError.unauthorized("Invalid 2FA code");
      }
    }

    const account = await accountRepository.findById(data.accountId);
    if (!account || account.userId !== data.userId) {
      throw AppError.forbidden("Account does not belong to user");
    }
    if (account.type !== "REAL") {
      throw AppError.badRequest("Withdrawals are only allowed from REAL accounts");
    }

    const pendingCount = await prisma.transaction.count({
      where: { userId: data.userId, type: "WITHDRAWAL", status: "PENDING" },
    });
    if (pendingCount >= 3) {
      throw AppError.badRequest("Maximum 3 pending withdrawals allowed. Please wait for existing withdrawals to complete.");
    }

    const cardLastFour = data.cardNumber.slice(-4);

    // Atomically check balance, decrement it, and create a PENDING transaction
    const tx = await prisma.$transaction(async (prismaTx) => {
      const current = await prismaTx.account.findUnique({
        where: { id: data.accountId },
        select: { balance: true },
      });
      if (!current || Number(current.balance) < data.amount) {
        throw AppError.badRequest("Insufficient balance");
      }
      await prismaTx.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: data.amount } },
      });
      return prismaTx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          type: "WITHDRAWAL",
          amount: data.amount,
          currency: data.currency,
          paymentMethod: "card",
          externalId: crypto.randomUUID(),
          cardLastFour,
        },
      });
    });

    try {
      await betaTransferService.createWithdrawal({
        transactionId: tx.id,
        amount: data.amount,
        currency: data.currency,
        cardNumber: data.cardNumber,
        userId: data.userId,
      });
    } catch (err) {
      logger.error({ txId: tx.id, err }, "BetaTransfer withdrawal failed — rolling back balance");
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: data.amount } },
      });
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: "FAILED" },
      });
      throw err;
    }

    return { transaction: toTransactionDTO(tx) };
  },
};
