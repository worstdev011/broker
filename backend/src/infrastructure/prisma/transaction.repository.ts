import type { Transaction, Account } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

export const transactionRepository = {
  async create(data: {
    userId: string;
    accountId: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    amount: number;
    currency: string;
    paymentMethod: string;
    externalId: string;
  }): Promise<Transaction> {
    return prisma.transaction.create({ data });
  },

  async findById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({ where: { id } });
  },

  async findByExternalId(externalId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({ where: { externalId } });
  },

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  },

  /**
   * Confirm a deposit: mark Transaction CONFIRMED + create ledger DEPOSIT + increment balance.
   * All in one atomic transaction. Returns null if transaction already processed (idempotent).
   */
  async confirmDeposit(
    transactionId: string,
    externalStatus: string,
  ): Promise<Account | null> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: { id: transactionId, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          externalStatus,
          confirmedAt: new Date(),
        },
      });

      if (updated.count === 0) return null;

      const txn = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId },
      });

      await tx.account.update({
        where: { id: txn.accountId },
        data: { balance: { increment: txn.amount } },
      });

      const account = await tx.account.findUniqueOrThrow({
        where: { id: txn.accountId },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: txn.accountId,
          type: "DEPOSIT",
          amount: txn.amount,
          direction: "CREDIT",
          balanceAfter: account.balance,
          referenceId: txn.id,
          referenceType: "TRANSACTION",
        },
      });

      return account;
    });
  },

  /**
   * Confirm a withdrawal: mark Transaction CONFIRMED + create ledger entry.
   * Balance was already decremented atomically at withdrawal-initiation time,
   * so we only record the ledger entry here — no balance change.
   */
  async confirmWithdrawal(
    transactionId: string,
    externalStatus: string,
  ): Promise<Account | null> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: { id: transactionId, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          externalStatus,
          confirmedAt: new Date(),
        },
      });

      if (updated.count === 0) return null;

      const txn = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId },
      });

      const account = await tx.account.findUniqueOrThrow({
        where: { id: txn.accountId },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: txn.accountId,
          type: "WITHDRAWAL",
          amount: txn.amount,
          direction: "DEBIT",
          balanceAfter: account.balance,
          referenceId: txn.id,
          referenceType: "TRANSACTION",
        },
      });

      return account;
    });
  },

  /**
   * Fail a transaction. For WITHDRAWAL type, refunds the balance that was
   * pre-deducted at initiation time.
   */
  async failTransaction(
    transactionId: string,
    externalStatus: string,
    failureReason?: string,
  ): Promise<Account | null> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: { id: transactionId, status: "PENDING" },
        data: {
          status: "FAILED",
          externalStatus,
          failureReason: failureReason ?? null,
        },
      });

      if (updated.count === 0) return null;

      const txn = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId },
      });

      if (txn.type === "WITHDRAWAL") {
        await tx.account.update({
          where: { id: txn.accountId },
          data: { balance: { increment: txn.amount } },
        });

        const account = await tx.account.findUniqueOrThrow({
          where: { id: txn.accountId },
        });

        await tx.ledgerEntry.create({
          data: {
            accountId: txn.accountId,
            type: "REFUND",
            amount: txn.amount,
            direction: "CREDIT",
            balanceAfter: account.balance,
            referenceId: txn.id,
            referenceType: "TRANSACTION",
          },
        });

        return account;
      }

      return null;
    });
  },
};
