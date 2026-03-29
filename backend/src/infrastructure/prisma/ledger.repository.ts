import { prisma } from "./client.js";

export const ledgerRepository = {
  async getBalanceHistory(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; balance: string }[]> {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, balanceAfter: true },
      orderBy: { createdAt: "asc" },
    });

    return entries.map((e) => ({
      date: e.createdAt.toISOString(),
      balance: e.balanceAfter.toString(),
    }));
  },
};
