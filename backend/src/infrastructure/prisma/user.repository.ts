import type { User } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

function randomSevenDigit(): number {
  return Math.floor(Math.random() * 9_000_000) + 1_000_000;
}

async function generateUniqueDisplayId(): Promise<number> {
  const MAX_ATTEMPTS = 20;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = randomSevenDigit();
    const existing = await prisma.user.findUnique({ where: { displayId: candidate } });
    if (!existing) return candidate;
  }
  // Extremely unlikely — 9M possible values. Throw to surface the issue.
  throw new Error("Failed to generate a unique displayId after multiple attempts");
}

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  },

  async createWithAccounts(data: {
    email: string;
    password: string | null;
    googleId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    partnerId?: string;
  }): Promise<User> {
    const displayId = await generateUniqueDisplayId();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: data.password,
          googleId: data.googleId ?? null,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          displayId,
          partnerId: data.partnerId ?? null,
          accounts: {
            create: [
              { type: "DEMO", balance: 10000 },
              { type: "REAL", balance: 0 },
            ],
          },
        },
      });

      const demoAccount = await tx.account.findFirst({
        where: { userId: user.id, type: "DEMO" },
      });

      if (demoAccount) {
        await tx.ledgerEntry.create({
          data: {
            accountId: demoAccount.id,
            type: "DEMO_RESET",
            amount: 10000,
            direction: "CREDIT",
            balanceAfter: 10000,
            description: "Initial demo balance",
          },
        });
      }

      return user;
    });
  },

  async linkGoogleAccount(
    userId: string,
    data: { googleId: string; firstName?: string | null; lastName?: string | null },
  ): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new Error("User not found");
    }
    return prisma.user.update({
      where: { id: userId },
      data: {
        googleId: data.googleId,
        firstName:
          existing.firstName == null && data.firstName
            ? data.firstName
            : undefined,
        lastName:
          existing.lastName == null && data.lastName
            ? data.lastName
            : undefined,
      },
    });
  },
};
