import type { PartnerEventType } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

export const partnerTrackingRepository = {
  async recordClick(data: {
    partnerId: string;
    ip?: string;
    userAgent?: string;
    referer?: string;
  }): Promise<void> {
    await prisma.partnerClick.create({
      data: {
        partnerId: data.partnerId,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        referer: data.referer ?? null,
      },
    });
  },

  async recordEvent(data: {
    partnerId: string;
    userId: string;
    type: PartnerEventType;
    amount?: number;
  }): Promise<void> {
    await prisma.partnerEvent.create({
      data: {
        partnerId: data.partnerId,
        userId: data.userId,
        type: data.type,
        amount: data.amount ?? null,
      },
    });
  },

  async hasEvent(data: {
    userId: string;
    type: PartnerEventType;
  }): Promise<boolean> {
    const count = await prisma.partnerEvent.count({
      where: { userId: data.userId, type: data.type },
    });
    return count > 0;
  },
};
