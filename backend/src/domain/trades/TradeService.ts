import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import type { InstrumentRepository } from '../../ports/repositories/InstrumentRepository.js';
import type { OpenTradeInput, Trade } from './TradeTypes.js';
import { TradeDirection, TradeStatus } from './TradeTypes.js';
import {
  InvalidTradeAmountError,
  InvalidExpirationError,
  InvalidTradeDirectionError,
  InstrumentNotFoundError,
  MarketClosedError,
  PriceUnavailableError,
} from './TradeErrors.js';
import { AccountNotFoundError, UnauthorizedAccountAccessError, InsufficientBalanceError } from '../accounts/AccountErrors.js';
import { AccountType } from '../accounts/AccountTypes.js';
import {
  DEFAULT_PAYOUT_PERCENT,
  TRADE_MIN_EXPIRATION_SECONDS,
  TRADE_MAX_EXPIRATION_SECONDS,
  TRADE_EXPIRATION_STEP,
  TRADE_MAX_AMOUNT,
} from '../../config/constants.js';

export class TradeService {
  constructor(
    private tradeRepository: TradeRepository,
    private accountRepository: AccountRepository,
    private priceProvider: PriceProvider,
    private transactionRepository?: TransactionRepository,
    private instrumentRepository?: InstrumentRepository,
  ) {}

  async openTrade(input: OpenTradeInput): Promise<Trade> {
    if (input.amount <= 0 || input.amount > TRADE_MAX_AMOUNT) {
      throw new InvalidTradeAmountError();
    }

    if (input.direction !== TradeDirection.CALL && input.direction !== TradeDirection.PUT) {
      throw new InvalidTradeDirectionError();
    }

    if (
      input.expirationSeconds < TRADE_MIN_EXPIRATION_SECONDS ||
      input.expirationSeconds > TRADE_MAX_EXPIRATION_SECONDS ||
      input.expirationSeconds % TRADE_EXPIRATION_STEP !== 0
    ) {
      throw new InvalidExpirationError();
    }

    const account = await this.accountRepository.findById(input.accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    if (account.userId !== input.userId) {
      throw new UnauthorizedAccountAccessError();
    }

    if (Number(account.balance) < input.amount) {
      throw new InsufficientBalanceError();
    }

    let payoutFraction = DEFAULT_PAYOUT_PERCENT / 100;
    if (this.instrumentRepository) {
      const inst = await this.instrumentRepository.findById(input.instrument);
      if (!inst) {
        throw new InstrumentNotFoundError(input.instrument);
      }
      payoutFraction = (inst.payoutPercent ?? DEFAULT_PAYOUT_PERCENT) / 100;
    }

    if (input.instrument.endsWith('_REAL')) {
      const day = new Date().getUTCDay();
      if (day === 0 || day === 6) {
        throw new MarketClosedError();
      }
    }

    const priceData = await this.priceProvider.getCurrentPrice(input.instrument);
    if (!priceData) {
      throw new PriceUnavailableError(input.instrument);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.expirationSeconds * 1000);

    try {
      return await this.tradeRepository.createWithBalanceDeduction(
        {
          userId: input.userId,
          accountId: input.accountId,
          direction: input.direction,
          instrument: input.instrument,
          amount: input.amount,
          entryPrice: priceData.price,
          exitPrice: null,
          payout: payoutFraction,
          status: TradeStatus.OPEN,
          expiresAt,
          closedAt: null,
        },
        input.accountId,
        input.amount,
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_BALANCE') {
        throw new InsufficientBalanceError();
      }
      throw err;
    }
  }

  async getTrades(userId: string): Promise<Trade[]> {
    return this.tradeRepository.findByUserId(userId);
  }

  async getTradesPaginated(
    userId: string,
    status: 'open' | 'closed',
    limit: number,
    offset: number,
  ): Promise<{ trades: Trade[]; hasMore: boolean }> {
    return this.tradeRepository.findByUserIdPaginated(userId, status, limit, offset);
  }

  async getTradeStatistics(userId: string): Promise<{
    totalTrades: number;
    winRate: number;
    totalVolume: number;
    netProfit: number;
    winCount: number;
    lossCount: number;
    tieCount: number;
    maxTrade: { amount: number; date: string } | null;
    minTrade: { amount: number; date: string } | null;
    bestProfit: { profit: number; date: string } | null;
  }> {
    const realAccount = await this.accountRepository.findByUserIdAndType(userId, AccountType.REAL);
    if (!realAccount) {
      return {
        totalTrades: 0, winRate: 0, totalVolume: 0, netProfit: 0,
        winCount: 0, lossCount: 0, tieCount: 0,
        maxTrade: null, minTrade: null, bestProfit: null,
      };
    }

    const trades = await this.tradeRepository.findByAccountId(realAccount.id);

    const totalTrades = trades.length;
    const winCount = trades.filter((t) => t.status === TradeStatus.WIN).length;
    const lossCount = trades.filter((t) => t.status === TradeStatus.LOSS).length;
    const tieCount = trades.filter((t) => t.status === TradeStatus.TIE).length;
    const winRate = totalTrades > 0 ? Math.round(((winCount / totalTrades) * 100) * 10) / 10 : 0;
    const totalVolume = trades.reduce((sum, t) => sum + Number(t.amount), 0);

    const netProfit = trades.reduce((sum, t) => {
      if (t.status === TradeStatus.WIN) return sum + Number(t.amount) * Number(t.payout);
      if (t.status === TradeStatus.LOSS) return sum - Number(t.amount);
      return sum;
    }, 0);

    const tradesWithAmounts = trades.map((t) => ({
      amount: Number(t.amount),
      date: t.openedAt.toISOString(),
    }));

    const maxTrade = tradesWithAmounts.length > 0
      ? tradesWithAmounts.reduce((max, t) => (t.amount > max.amount ? t : max))
      : null;

    const minTrade = tradesWithAmounts.length > 0
      ? tradesWithAmounts.reduce((min, t) => (t.amount < min.amount ? t : min))
      : null;

    const winTrades = trades.filter((t) => t.status === TradeStatus.WIN);
    const bestProfit = winTrades.length > 0
      ? winTrades
          .map((t) => ({
            profit: Number(t.amount) * Number(t.payout),
            date: t.closedAt?.toISOString() ?? t.openedAt.toISOString(),
          }))
          .reduce((best, t) => (t.profit > best.profit ? t : best))
      : null;

    return {
      totalTrades, winRate, totalVolume, netProfit,
      winCount, lossCount, tieCount,
      maxTrade, minTrade, bestProfit,
    };
  }

  async getBalanceHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; balance: number }>> {
    const realAccount = await this.accountRepository.findByUserIdAndType(userId, AccountType.REAL);
    if (!realAccount || !this.transactionRepository) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) return [];

    const [initialTx, initialTrades, rangeTx, rangeTrades] = await Promise.all([
      this.transactionRepository.findConfirmedByAccountIdBefore(realAccount.id, start),
      this.tradeRepository.findClosedByAccountIdBefore(realAccount.id, start),
      this.transactionRepository.findConfirmedByAccountIdInDateRange(realAccount.id, start, end),
      this.tradeRepository.findClosedByAccountIdInDateRange(realAccount.id, start, end),
    ]);

    let initialBalance = 0;
    for (const tx of initialTx) {
      initialBalance += tx.type === 'DEPOSIT' ? Number(tx.amount) : -Math.abs(Number(tx.amount));
    }
    for (const trade of initialTrades) {
      if (trade.status === TradeStatus.WIN) initialBalance += Number(trade.amount) * Number(trade.payout);
      else if (trade.status === TradeStatus.LOSS) initialBalance -= Number(trade.amount);
    }

    const dailyChanges = new Map<string, number>();
    const cur = new Date(start);
    while (cur <= end) {
      dailyChanges.set(cur.toISOString().split('T')[0]!, 0);
      cur.setDate(cur.getDate() + 1);
    }

    for (const tx of rangeTx) {
      const key = tx.createdAt.toISOString().split('T')[0]!;
      const prev = dailyChanges.get(key) ?? 0;
      dailyChanges.set(key, prev + (tx.type === 'DEPOSIT' ? Number(tx.amount) : -Math.abs(Number(tx.amount))));
    }

    for (const trade of rangeTrades) {
      if (!trade.closedAt) continue;
      const key = trade.closedAt.toISOString().split('T')[0]!;
      const prev = dailyChanges.get(key) ?? 0;
      if (trade.status === TradeStatus.WIN) {
        dailyChanges.set(key, prev + Number(trade.amount) * Number(trade.payout));
      } else if (trade.status === TradeStatus.LOSS) {
        dailyChanges.set(key, prev - Number(trade.amount));
      }
    }

    let cumulative = initialBalance;
    const result: Array<{ date: string; balance: number }> = [];
    for (const dateKey of Array.from(dailyChanges.keys()).sort()) {
      cumulative += dailyChanges.get(dateKey) ?? 0;
      result.push({ date: dateKey, balance: cumulative });
    }

    if (result.length === 0) {
      return [{ date: end.toISOString().split('T')[0]!, balance: Number(realAccount.balance) }];
    }

    return result;
  }

  async getTradeAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    byInstrument: Array<{ instrument: string; count: number; volume: number; winCount: number }>;
    byDirection: { call: { count: number; winCount: number }; put: { count: number; winCount: number } };
  }> {
    const realAccount = await this.accountRepository.findByUserIdAndType(userId, AccountType.REAL);
    if (!realAccount) {
      return {
        byInstrument: [],
        byDirection: { call: { count: 0, winCount: 0 }, put: { count: 0, winCount: 0 } },
      };
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const closedTrades = await this.tradeRepository.findClosedByAccountIdInDateRange(realAccount.id, start, end);

    const byInstrumentMap = new Map<string, { count: number; volume: number; winCount: number }>();
    let callCount = 0, callWin = 0, putCount = 0, putWin = 0;

    for (const t of closedTrades) {
      const inst = t.instrument || 'Unknown';
      const entry = byInstrumentMap.get(inst) ?? { count: 0, volume: 0, winCount: 0 };
      entry.count++;
      entry.volume += Number(t.amount);
      if (t.status === TradeStatus.WIN) entry.winCount++;
      byInstrumentMap.set(inst, entry);

      if (t.direction === 'CALL') {
        callCount++;
        if (t.status === TradeStatus.WIN) callWin++;
      } else {
        putCount++;
        if (t.status === TradeStatus.WIN) putWin++;
      }
    }

    return {
      byInstrument: Array.from(byInstrumentMap.entries())
        .map(([instrument, data]) => ({ instrument, ...data }))
        .sort((a, b) => b.count - a.count),
      byDirection: {
        call: { count: callCount, winCount: callWin },
        put: { count: putCount, winCount: putWin },
      },
    };
  }
}
