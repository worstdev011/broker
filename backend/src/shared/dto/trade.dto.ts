import type { Trade } from "../../generated/prisma/client.js";

export interface TradeDTO {
  id: string;
  instrument: string;
  direction: "CALL" | "PUT";
  amount: string;
  entryPrice: string;
  exitPrice: string | null;
  payoutPercent: number;
  payoutAmount: string | null;
  status: "OPEN" | "WIN" | "LOSS" | "TIE";
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
}

export function toTradeDTO(trade: Trade): TradeDTO {
  return {
    id: trade.id,
    instrument: trade.instrumentId,
    direction: trade.direction,
    amount: trade.amount.toString(),
    entryPrice: trade.entryPrice.toString(),
    exitPrice: trade.exitPrice?.toString() ?? null,
    payoutPercent: trade.payoutPercent,
    payoutAmount: trade.payoutAmount?.toString() ?? null,
    status: trade.status,
    openedAt: trade.openedAt.toISOString(),
    expiresAt: trade.expiresAt.toISOString(),
    closedAt: trade.closedAt?.toISOString() ?? null,
  };
}
