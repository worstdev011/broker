import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { Trade, TradeDTO } from './TradeTypes.js';
import { TradeStatus } from './TradeTypes.js';
import { TradeEntity } from './TradeEntity.js';
import { emitTradeClose, emitAccountSnapshot } from '../../bootstrap/websocket.bootstrap.js';
import { unregisterTradeFromCountdown } from '../../bootstrap/time.bootstrap.js';
import { logger } from '../../shared/logger.js';
import { AccountService } from '../accounts/AccountService.js';
import { TRADE_STALE_THRESHOLD_MS } from '../../config/constants.js';

function tradeToDTO(trade: Trade): TradeDTO {
  return {
    id: trade.id,
    accountId: trade.accountId,
    direction: trade.direction,
    instrument: trade.instrument,
    amount: trade.amount.toString(),
    entryPrice: trade.entryPrice.toString(),
    exitPrice: trade.exitPrice !== null ? trade.exitPrice.toString() : null,
    payout: trade.payout.toString(),
    status: trade.status,
    openedAt: trade.openedAt.toISOString(),
    expiresAt: trade.expiresAt.toISOString(),
    closedAt: trade.closedAt !== null ? trade.closedAt.toISOString() : null,
  };
}

export class TradeClosingService {
  constructor(
    private tradeRepository: TradeRepository,
    private accountRepository: AccountRepository,
    private priceProvider: PriceProvider,
    private accountService: AccountService,
  ) {}

  async closeExpiredTrades(): Promise<void> {
    const now = new Date();
    const expiredTrades = await this.tradeRepository.findOpenExpired(now);

    if (expiredTrades.length === 0) return;

    logger.info(`Closing ${expiredTrades.length} expired trade(s)`);

    for (const tradeData of expiredTrades) {
      try {
        const priceData = await this.priceProvider.getCurrentPrice(tradeData.instrument);
        if (!priceData) {
          const staleSinceMs = now.getTime() - tradeData.expiresAt.getTime();
          if (staleSinceMs > TRADE_STALE_THRESHOLD_MS) {
            logger.warn(`Force-closing stale trade ${tradeData.id} as TIE (no price after ${Math.round(staleSinceMs / 1000)}s)`);
            await this.closeTrade(tradeData, tradeData.entryPrice, now);
          } else {
            logger.error(`Price unavailable for ${tradeData.instrument}, skipping trade ${tradeData.id}`);
          }
          continue;
        }
        await this.closeTrade(tradeData, priceData.price, now);
      } catch (error) {
        logger.error({ err: error }, `Failed to close trade ${tradeData.id}`);
      }
    }
  }

  private async closeTrade(tradeData: Trade, exitPrice: number, closedAt: Date): Promise<void> {
    const entity = new TradeEntity(
      tradeData.id, tradeData.userId, tradeData.accountId,
      tradeData.direction, tradeData.instrument, tradeData.amount,
      tradeData.entryPrice, exitPrice, tradeData.payout,
      tradeData.status, tradeData.openedAt, tradeData.expiresAt, tradeData.closedAt,
    );

    const status = entity.determineResult();
    const payoutAmount = entity.calculatePayoutAmount();

    let balanceDelta = 0;
    if (status === TradeStatus.WIN) {
      balanceDelta = entity.amount + payoutAmount;
    } else if (status === TradeStatus.TIE) {
      balanceDelta = entity.amount;
    }

    const updatedTrade = await this.tradeRepository.closeWithBalanceCredit(
      entity.id, exitPrice, status, closedAt, entity.accountId, balanceDelta,
    );

    logger.info(`Trade ${entity.id} closed: ${status}, delta=${balanceDelta}`);

    try {
      const resultType = status === TradeStatus.WIN ? 'WIN' : status === TradeStatus.TIE ? 'TIE' : 'LOSS';
      emitTradeClose(tradeToDTO(updatedTrade), entity.userId, resultType);

      const snapshot = await this.accountService.getAccountSnapshot(entity.userId);
      if (snapshot) {
        emitAccountSnapshot(entity.userId, {
          ...snapshot,
          currency: snapshot.currency as 'USD' | 'RUB' | 'UAH',
        });
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to emit WebSocket events after trade close');
    }

    try {
      unregisterTradeFromCountdown(entity.id);
    } catch {
      // Cleanup failure is non-critical
    }
  }
}
