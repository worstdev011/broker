import { randomBytes } from "node:crypto";
import type { Partner } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

const REF_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const REF_CODE_LENGTH = 8;
const MAX_REF_CODE_ATTEMPTS = 10;

function generateRefCode(): string {
  let code = "";
  const bytes = randomBytes(REF_CODE_LENGTH);
  for (let i = 0; i < REF_CODE_LENGTH; i++) {
    code += REF_CODE_CHARS[bytes[i] % REF_CODE_CHARS.length];
  }
  return code;
}

export const partnerRepository = {
  async findById(id: string): Promise<Partner | null> {
    return prisma.partner.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<Partner | null> {
    return prisma.partner.findUnique({ where: { email } });
  },

  async findByRefCode(refCode: string): Promise<Partner | null> {
    return prisma.partner.findUnique({ where: { refCode } });
  },

  async create(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    telegramHandle?: string;
  }): Promise<Partner> {
    let refCode = "";
    let attempts = 0;

    while (attempts < MAX_REF_CODE_ATTEMPTS) {
      const candidate = generateRefCode();
      const existing = await prisma.partner.findUnique({
        where: { refCode: candidate },
      });
      if (!existing) {
        refCode = candidate;
        break;
      }
      attempts++;
    }

    if (!refCode) {
      throw new Error("Failed to generate unique refCode after max attempts");
    }

    return prisma.partner.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        telegramHandle: data.telegramHandle ?? null,
        refCode,
        status: "ACTIVE",
      },
    });
  },

  async updateBalance(
    id: string,
    amount: number,
    direction: "increment" | "decrement",
  ): Promise<Partner> {
    return prisma.partner.update({
      where: { id },
      data: {
        balance: { [direction]: amount },
        ...(direction === "increment"
          ? { totalEarned: { increment: amount } }
          : {}),
      },
    });
  },

  /** Atomically increments balance and totalEarned by the given earning amount. */
  async addEarning(partnerId: string, amount: number): Promise<Partner> {
    return prisma.partner.update({
      where: { id: partnerId },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });
  },
};
