import { transactionRepository } from "../../infrastructure/prisma/transaction.repository.js";
import { accountRepository } from "../../infrastructure/prisma/account.repository.js";
import { betaTransferService } from "../../services/BetaTransferService.js";
import { toTransactionDTO, type TransactionDTO } from "../../shared/dto/transaction.dto.js";
import { AppError } from "../../shared/errors/AppError.js";

const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 100_000;

export const depositService = {
  async initiateDeposit(data: {
    userId: string;
    accountId: string;
    amount: number;
    currency: string;
  }): Promise<{ transaction: TransactionDTO; paymentUrl: string }> {
    if (data.amount < MIN_DEPOSIT || data.amount > MAX_DEPOSIT) {
      throw AppError.badRequest(`Deposit amount must be between ${MIN_DEPOSIT} and ${MAX_DEPOSIT}`);
    }

    const account = await accountRepository.findById(data.accountId);
    if (!account || account.userId !== data.userId) {
      throw AppError.forbidden("Account does not belong to user");
    }
    if (account.type !== "REAL") {
      throw AppError.badRequest("Deposits are only allowed on REAL accounts");
    }

    const tx = await transactionRepository.create({
      userId: data.userId,
      accountId: data.accountId,
      type: "DEPOSIT",
      amount: data.amount,
      currency: data.currency,
      paymentMethod: "card",
      externalId: crypto.randomUUID(),
    });

    const payment = await betaTransferService.createPayment({
      transactionId: tx.id,
      amount: data.amount,
      currency: data.currency,
      userId: data.userId,
    });

    return {
      transaction: toTransactionDTO(tx),
      paymentUrl: payment.paymentUrl,
    };
  },
};
