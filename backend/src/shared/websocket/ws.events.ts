import type { AccountDTO } from "../dto/account.dto.js";
import type { TradeDTO } from "../dto/trade.dto.js";
import { wsManager } from "../../websocket/ws.manager.js";

export function sendAccountSnapshot(userId: string, account: AccountDTO): void {
  wsManager.sendToUser(userId, {
    type: "account.snapshot",
    data: {
      accountId: account.id,
      accountType: account.type,
      balance: account.balance,
      currency: account.currency,
    },
  });
}

export function sendTradeOpen(userId: string, trade: TradeDTO): void {
  wsManager.sendToUser(userId, { type: "trade:open", data: trade });
}

export function sendTradeClose(userId: string, trade: TradeDTO, pnl: number): void {
  wsManager.sendToUser(userId, { type: "trade:close", data: { ...trade, pnl } });
}
