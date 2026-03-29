import { PRICE_EPSILON } from "./trade.constants.js";

export type TradeResult = "WIN" | "LOSS" | "TIE";

export function determineResult(
  direction: "CALL" | "PUT",
  entryPrice: number,
  exitPrice: number,
): TradeResult {
  const diff = exitPrice - entryPrice;

  if (Math.abs(diff) <= PRICE_EPSILON) return "TIE";

  if (direction === "CALL") {
    return diff > 0 ? "WIN" : "LOSS";
  }

  return diff < 0 ? "WIN" : "LOSS";
}

export function calculatePayoutAmount(
  amount: number,
  payoutPercent: number,
): number {
  return (amount * payoutPercent) / 100;
}

export function calculatePnl(
  status: TradeResult,
  amount: number,
  payoutAmount: number,
): number {
  if (status === "WIN") return payoutAmount;
  if (status === "LOSS") return -amount;
  return 0;
}
