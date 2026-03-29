import type { Account } from "../../generated/prisma/client.js";

export interface AccountDTO {
  id: string;
  type: "DEMO" | "REAL";
  balance: string;
  currency: string;
  isActive: boolean;
}

export function toAccountDTO(account: Account): AccountDTO {
  return {
    id: account.id,
    type: account.type,
    balance: account.balance.toString(),
    currency: account.currency,
    isActive: account.isActive,
  };
}
