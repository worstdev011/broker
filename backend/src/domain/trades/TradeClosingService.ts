/**
 * Trade Closing Service - closes expired trades
 */

import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { Trade } from './TradeTypes.js';
import { TradeStatus } from './TradeTypes.js';
import { TradeEntity } from './TradeEntity.js';
import { emitTradeClose, emitAccountSnapshot } from '../../bootstrap/websocket.bootstrap.js';
import { unregisterTradeFromCountdown } from '../../bootstrap/time.bootstrap.js';
import { logger } from '../../shared/logger.js';
import { AccountService } from '../accounts/AccountService.js';

export class TradeClosingService {
  constructor(
    private tradeRepository: TradeRepository,
    private accountRepository: AccountRepository,
    private priceProvider: PriceProvider,
    private accountService: AccountService,
  ) {}

  /**
   * Close all expired trades
   */
  async closeExpiredTrades(): Promise<void> {
    const now = new Date();

    // Find all open expired trades
    const expiredTrades = await this.tradeRepository.findOpenExpired(now);

    if (expiredTrades.length === 0) {
      return;
    }

    logger.info(`Closing ${expiredTrades.length} expired trade(s)`);

    // Close each trade with its own instrument price
    const STALE_THRESHOLD_MS = 60_000;

    for (const tradeData of expiredTrades) {
      try {
        const priceData = await this.priceProvider.getCurrentPrice(tradeData.instrument);
        if (!priceData) {
          const staleSinceMs = now.getTime() - tradeData.expiresAt.getTime();
          if (staleSinceMs > STALE_THRESHOLD_MS) {
            logger.warn(`Force-closing stale trade ${tradeData.id} as TIE (no price for ${tradeData.instrument} after ${Math.round(staleSinceMs / 1000)}s)`);
            await this.closeTrade(tradeData, tradeData.entryPrice, now);
          } else {
            logger.error(`Price service unavailable for instrument ${tradeData.instrument}, skipping trade ${tradeData.id}`);
          }
          continue;
        }

        const exitPrice = priceData.price;
        await this.closeTrade(tradeData, exitPrice, now);
      } catch (error) {
        logger.error(`Failed to close trade ${tradeData.id}:`, error);
        // Continue with other trades
      }
    }
  }

  /**
   * Close a single trade
   */
  private async closeTrade(tradeData: Trade, exitPrice: number, closedAt: Date): Promise<void> {
    // Create entity
    const trade = new TradeEntity(
      tradeData.id,
      tradeData.userId,
      tradeData.accountId,
      tradeData.direction,
      tradeData.instrument, // ✅ Передаем instrument
      tradeData.amount,
      tradeData.entryPrice,
      exitPrice,
      tradeData.payout,
      tradeData.status,
      tradeData.openedAt,
      tradeData.expiresAt,
      tradeData.closedAt,
    );

    // Determine result
    const status = trade.determineResult();

    // Calculate payout amount
    const payoutAmount = trade.calculatePayoutAmount();

    // 🔥 FIX: Атомарная операция — обновление статуса + зачисление на баланс в одной транзакции.
    // Раньше: updateResult → updateBalance (если updateBalance падает — сделка закрыта, но деньги не зачислены).
    // Теперь: обе операции в $transaction — если одна падает, откатываются обе.
    let balanceDelta = 0;
    if (status === TradeStatus.WIN) {
      balanceDelta = trade.amount + payoutAmount;
    } else if (status === TradeStatus.TIE) {
      balanceDelta = trade.amount;
    }
    // LOSS: balanceDelta = 0 — ничего не зачисляем

    const updatedTrade = await this.tradeRepository.closeWithBalanceCredit(
      trade.id,
      exitPrice,
      status,
      closedAt,
      trade.accountId,
      balanceDelta,
    );

    if (status === TradeStatus.WIN) {
      logger.info(`Trade ${trade.id} closed as WIN. Payout: ${balanceDelta}`);
    } else if (status === TradeStatus.TIE) {
      logger.info(`Trade ${trade.id} closed as TIE. Refund: ${balanceDelta}`);
    } else {
      logger.info(`Trade ${trade.id} closed as LOSS. Amount lost: ${trade.amount}`);
    }

    // Emit WebSocket events
    try {
      const tradeDTO: import('./TradeTypes.js').TradeDTO = {
        id: updatedTrade.id,
        accountId: updatedTrade.accountId,
        direction: updatedTrade.direction,
        instrument: updatedTrade.instrument, // Trading instrument
        amount: updatedTrade.amount.toString(),
        entryPrice: updatedTrade.entryPrice.toString(),
        exitPrice: updatedTrade.exitPrice !== null ? updatedTrade.exitPrice.toString() : null,
        payout: updatedTrade.payout.toString(),
        status: updatedTrade.status,
        openedAt: updatedTrade.openedAt.toISOString(),
        expiresAt: updatedTrade.expiresAt.toISOString(),
        closedAt: updatedTrade.closedAt !== null ? updatedTrade.closedAt.toISOString() : null,
      };
      const resultType = status === TradeStatus.WIN ? 'WIN' : status === TradeStatus.TIE ? 'TIE' : 'LOSS';
      emitTradeClose(tradeDTO, trade.userId, resultType);
      
      // 🔥 FLOW A-ACCOUNT: Emit account snapshot after balance update
      const snapshot = await this.accountService.getAccountSnapshot(trade.userId);
      if (snapshot) {
        emitAccountSnapshot(trade.userId, snapshot);
      }
      
    } catch (error) {
      logger.error('Failed to emit WebSocket events:', error);
    }
    
    try {
      unregisterTradeFromCountdown(trade.id);
    } catch {
      // Ignore errors in cleanup
    }
  }
}
