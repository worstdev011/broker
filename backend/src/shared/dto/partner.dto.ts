import type { Partner } from "../../generated/prisma/client.js";

export interface PartnerPublicDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  telegramHandle: string | null;
  refCode: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  revsharePercent: number;
  balance: string;
  totalEarned: string;
  createdAt: string;
}

export function toPartnerPublicDTO(partner: Partner): PartnerPublicDTO {
  return {
    id: partner.id,
    email: partner.email,
    firstName: partner.firstName,
    lastName: partner.lastName,
    telegramHandle: partner.telegramHandle,
    refCode: partner.refCode,
    status: partner.status,
    revsharePercent: partner.revsharePercent,
    balance: partner.balance.toString(),
    totalEarned: partner.totalEarned.toString(),
    createdAt: partner.createdAt.toISOString(),
  };
}
