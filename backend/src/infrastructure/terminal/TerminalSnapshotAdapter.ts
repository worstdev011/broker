/**
 * Terminal Snapshot Adapter - aggregates data from various sources
 * FLOW P4: uses PriceEngineManager, instrument = instrumentId (EURUSD_OTC, …)
 */

import type { TerminalSnapshotPort } from '../../ports/terminal/TerminalSnapshotPort.js';
import type { TerminalSnapshot, SnapshotCandle } from '../../domain/terminal/TerminalSnapshotTypes.js';
import type { Timeframe } from '../../prices/PriceTypes.js';
import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { PriceEngineManager } from '../../prices/PriceEngineManager.js';
import type { Clock } from '../../domain/time/TimeTypes.js';
import { TradeStatus } from '../../domain/trades/TradeTypes.js';
import { TimeService } from '../../domain/time/TimeService.js';
import { getInstrumentOrDefault } from '../../config/instruments.js';
import { getMarketStatus } from '../../domain/terminal/MarketStatus.js';

export class TerminalSnapshotAdapter implements TerminalSnapshotPort {
  private timeService: TimeService;

  constructor(
    private userRepository: UserRepository,
    private accountRepository: AccountRepository,
    private tradeRepository: TradeRepository,
    private getManager: () => PriceEngineManager,
    clock: Clock,
  ) {
    this.timeService = new TimeService(clock);
  }

  async getSnapshot(userId: string, instrument: string, timeframe: Timeframe): Promise<TerminalSnapshot> {
    const serverTime = this.timeService.now();
    const manager = this.getManager();
    const config = getInstrumentOrDefault(instrument);
    // Унифицированный symbol для отображения (EUR/USD формат) для всех инструментов
    const symbol = config.source === 'otc' 
      ? config.engine?.asset ?? `${config.base}/${config.quote}` // "EUR/USD"
      : config.real?.symbol ?? `${config.base}/${config.quote}`; // "EUR/USD" - унифицированный формат

    // FLOW C-MARKET-CLOSED: Определяем статус рынка
    // FLOW C-MARKET-ALTERNATIVES: Передаем текущий инструмент для исключения из альтернатив
    const marketStatus = getMarketStatus(config.source, instrument, serverTime);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
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

    // FLOW C-MARKET-CLOSED: Если рынок закрыт, price может быть null
    const priceData = marketStatus.marketOpen 
      ? await manager.getCurrentPrice(instrument)
      : null;
    const priceDTO = priceData
      ? {
          asset: symbol,
          value: priceData.price,
          timestamp: priceData.timestamp,
        }
      : null;

    const candles = await manager.getCandles(instrument, timeframe, 100);
    const candlesDTO: SnapshotCandle[] = candles.map((candle) => {
      const timestamp =
        typeof candle.timestamp === 'number'
          ? candle.timestamp
          : new Date(candle.timestamp).getTime();

      return {
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        startTime: timestamp,
        endTime: timestamp + this.getTimeframeMs(timeframe),
      };
    });

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
      user: {
        id: user.id,
        email: user.email,
      },
      accounts: accountsDTO,
      activeAccount: activeAccountDTO,
      price: priceDTO,
      candles: {
        timeframe,
        items: candlesDTO,
      },
      openTrades: openTradesDTO,
      serverTime,
      marketOpen: marketStatus.marketOpen,
      marketStatus: marketStatus.marketStatus,
      nextMarketOpenAt: marketStatus.nextMarketOpenAt, // FLOW C-MARKET-COUNTDOWN
      topAlternatives: marketStatus.topAlternatives, // FLOW C-MARKET-ALTERNATIVES
    };
  }

  private getTimeframeMs(timeframe: Timeframe): number {
    const timeframeSeconds: Record<Timeframe, number> = {
      '5s': 5,
      '10s': 10,
      '15s': 15,
      '30s': 30,
      '1m': 60,
      '2m': 120,
      '3m': 180,
      '5m': 300,
      '10m': 600,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };
    return timeframeSeconds[timeframe] * 1000;
  }
}
