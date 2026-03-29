import type { Account } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

export const accountRepository = {
  async findByUserId(userId: string): Promise<Account[]> {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { type: "asc" },
    });
  },

  async findById(id: string): Promise<Account | null> {
    return prisma.account.findUnique({ where: { id } });
  },

  async findByUserIdAndType(
    userId: string,
    type: "DEMO" | "REAL",
  ): Promise<Account | null> {
    return prisma.account.findFirst({ where: { userId, type } });
  },

  async switchActive(userId: string, accountId: string): Promise<Account> {
    await prisma.account.updateMany({
      where: { userId, id: { not: accountId } },
      data: { isActive: false },
    });
    return prisma.account.update({
      where: { id: accountId },
      data: { isActive: true },
    });
  },

  async resetDemoBalance(accountId: string): Promise<Account> {
    const TARGET = 10000;

    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: accountId },
        select: { balance: true },
      });
      const currentBalance = Number(account.balance);
      const diff = TARGET - currentBalance;

      if (diff !== 0) {
        await tx.ledgerEntry.create({
          data: {
            accountId,
            type: "DEMO_RESET",
            amount: Math.abs(diff),
            direction: diff > 0 ? "CREDIT" : "DEBIT",
            balanceAfter: TARGET,
            description: "Demo balance reset",
          },
        });
      }

      return tx.account.update({
        where: { id: accountId },
        data: { balance: TARGET },
      });
    });
  },
};
