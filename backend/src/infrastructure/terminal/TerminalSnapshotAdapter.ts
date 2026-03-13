import type { TerminalSnapshotPort } from '../../ports/terminal/TerminalSnapshotPort.js';
import type { TerminalSnapshot } from '../../domain/terminal/TerminalSnapshotTypes.js';
import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { Clock } from '../../domain/time/TimeTypes.js';
import { TradeStatus } from '../../domain/trades/TradeTypes.js';
import { TimeService } from '../../domain/time/TimeService.js';
import { UserNotFoundError } from '../../domain/user/UserErrors.js';

export class TerminalSnapshotAdapter implements TerminalSnapshotPort {
  private timeService: TimeService;

  constructor(
    private userRepository: UserRepository,
    private accountRepository: AccountRepository,
    private tradeRepository: TradeRepository,
    clock: Clock,
  ) {
    this.timeService = new TimeService(clock);
  }

  async getSnapshot(userId: string, instrument: string): Promise<TerminalSnapshot> {
    const serverTime = this.timeService.now();

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const accounts = await this.accountRepository.findByUserId(userId);
    const accountsDTO = accounts.map((acc) => ({
      id: acc.id,
      type: acc.type as 'demo' | 'real',
      balance: acc.balance.toString(),
      currency: acc.currency,
      isActive: acc.isActive,
    }));

    const activeAccount = await this.accountRepository.findActiveByUserId(userId);
    const activeAccountDTO = activeAccount
      ? {
          id: activeAccount.id,
          type: activeAccount.type as 'demo' | 'real',
          balance: activeAccount.balance.toString(),
          currency: activeAccount.currency,
        }
      : null;

    const allTrades = await this.tradeRepository.findByUserId(userId);
    const openTrades = allTrades.filter((t) => t.status === TradeStatus.OPEN);
    const openTradesDTO = openTrades.map((trade) => ({
      id: trade.id,
      direction: trade.direction as 'CALL' | 'PUT',
      amount: trade.amount.toString(),
      entryPrice: trade.entryPrice.toString(),
      openedAt: trade.openedAt.toISOString(),
      expiresAt: trade.expiresAt.getTime(),
      payout: trade.payout.toString(),
      secondsLeft: this.timeService.secondsLeft(trade.expiresAt.getTime()),
    }));

    return {
      instrument,
      user: { id: user.id, email: user.email },
      accounts: accountsDTO,
      activeAccount: activeAccountDTO,
      openTrades: openTradesDTO,
      serverTime,
    };
  }
}
