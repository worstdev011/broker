import { accountRepository } from "../../infrastructure/prisma/account.repository.js";
import { toAccountDTO, type AccountDTO } from "../../shared/dto/account.dto.js";
import { AppError } from "../../shared/errors/AppError.js";

export const accountService = {
  async listByUser(userId: string): Promise<AccountDTO[]> {
    const accounts = await accountRepository.findByUserId(userId);
    return accounts.map(toAccountDTO);
  },

  async switchAccount(userId: string, accountId: string): Promise<AccountDTO> {
    const account = await accountRepository.findById(accountId);

    if (!account || account.userId !== userId) {
      throw AppError.forbidden("Account does not belong to this user");
    }

    const updated = await accountRepository.switchActive(userId, accountId);
    return toAccountDTO(updated);
  },

  async resetDemo(userId: string): Promise<AccountDTO> {
    const account = await accountRepository.findByUserIdAndType(userId, "DEMO");

    if (!account) {
      throw AppError.notFound("Demo account not found");
    }

    const updated = await accountRepository.resetDemoBalance(account.id);

    return toAccountDTO(updated);
  },

  async snapshot(
    userId: string,
    type?: "DEMO" | "REAL",
  ): Promise<{
    accountId: string;
    type: string;
    balance: string;
    currency: string;
    updatedAt: string;
  }> {
    const account = type
      ? await accountRepository.findByUserIdAndType(userId, type)
      : await accountRepository.findByUserIdAndType(userId, "REAL");

    if (!account) {
      throw AppError.notFound("Account not found");
    }

    return {
      accountId: account.id,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      updatedAt: account.updatedAt.toISOString(),
    };
  },
};
