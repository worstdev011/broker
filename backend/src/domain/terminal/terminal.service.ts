import { prisma } from "../../infrastructure/prisma/client.js";
import { accountRepository } from "../../infrastructure/prisma/account.repository.js";
import { toAccountDTO, type AccountDTO } from "../../shared/dto/account.dto.js";
import { toTradeDTO, type TradeDTO } from "../../shared/dto/trade.dto.js";
import { AppError } from "../../shared/errors/AppError.js";

export interface TerminalSnapshot {
  instrument: string | null;
  user: { id: string; email: string };
  accounts: AccountDTO[];
  activeAccount: AccountDTO | null;
  openTrades: TradeDTO[];
  serverTime: number;
}

export const terminalService = {
  async getSnapshot(userId: string, instrument?: string): Promise<TerminalSnapshot> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw AppError.notFound("User not found");

    const accounts = await accountRepository.findByUserId(userId);
    const activeAccount = accounts.find((a) => a.isActive) ?? null;

    let openTrades: TradeDTO[] = [];
    if (activeAccount) {
      const trades = await prisma.trade.findMany({
        where: {
          userId,
          accountId: activeAccount.id,
          status: "OPEN",
          ...(instrument ? { instrumentId: instrument } : {}),
        },
        orderBy: { openedAt: "desc" },
      });
      openTrades = trades.map(toTradeDTO);
    }

    return {
      instrument: instrument ?? null,
      user: { id: user.id, email: user.email },
      accounts: accounts.map(toAccountDTO),
      activeAccount: activeAccount ? toAccountDTO(activeAccount) : null,
      openTrades,
      serverTime: Date.now(),
    };
  },
};
