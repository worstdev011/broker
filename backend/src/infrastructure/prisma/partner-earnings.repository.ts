import type { PartnerEarning } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

export const partnerEarningsRepository = {
  async findByTradeId(tradeId: string): Promise<PartnerEarning | null> {
    return prisma.partnerEarning.findUnique({ where: { tradeId } });
  },

  async create(data: {
    partnerId: string;
    userId: string;
    tradeId: string;
    amount: number;
  }): Promise<PartnerEarning> {
    return prisma.partnerEarning.create({
      data: {
        partnerId: data.partnerId,
        userId: data.userId,
        tradeId: data.tradeId,
        amount: data.amount,
      },
    });
  },

  /**
   * Atomic: creates partner_earnings record + increments partner.balance and totalEarned.
   * If a record for this tradeId already exists the unique constraint will throw — caller
   * must catch and treat as a no-op.
   */
  async createWithPartnerUpdate(data: {
    partnerId: string;
    userId: string;
    tradeId: string;
    amount: number;
  }): Promise<void> {
    await prisma.$transaction([
      prisma.partnerEarning.create({
        data: {
          partnerId: data.partnerId,
          userId: data.userId,
          tradeId: data.tradeId,
          amount: data.amount,
        },
      }),
      prisma.partner.update({
        where: { id: data.partnerId },
        data: {
          balance: { increment: data.amount },
          totalEarned: { increment: data.amount },
        },
      }),
    ]);
  },
};
