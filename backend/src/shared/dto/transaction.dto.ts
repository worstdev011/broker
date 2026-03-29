import type { Transaction } from "../../generated/prisma/client.js";

export interface TransactionDTO {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  status: "PENDING" | "CONFIRMED" | "FAILED";
  amount: number;
  currency: string;
  method: string;
  date: string;
  confirmedAt: string | null;
}

export function toTransactionDTO(tx: Transaction): TransactionDTO {
  return {
    id: tx.id,
    type: tx.type === "WITHDRAWAL" ? "WITHDRAWAL" : "DEPOSIT",
    status: tx.status,
    amount: Number(tx.amount),
    currency: tx.currency,
    method: tx.paymentMethod,
    date: tx.createdAt.toISOString(),
    confirmedAt: tx.confirmedAt?.toISOString() ?? null,
  };
}
