import { tradeRepository } from "../../infrastructure/prisma/trade.repository.js";
import { userRepository } from "../../infrastructure/prisma/user.repository.js";
import { partnerRepository } from "../../infrastructure/prisma/partner.repository.js";
import { partnerEarningsRepository } from "../../infrastructure/prisma/partner-earnings.repository.js";
import { priceProvider } from "../../prices/PriceProvider.js";
import { getRedis } from "../../bootstrap/redis.js";
import { toTradeDTO } from "../../shared/dto/trade.dto.js";
import { toAccountDTO } from "../../shared/dto/account.dto.js";
import { sendTradeClose, sendAccountSnapshot } from "../../shared/websocket/ws.events.js";
import { logger } from "../../shared/logger.js";
import {
  determineResult,
  calculatePayoutAmount,
  calculatePnl,
} from "./trade.entity.js";
import { ACTIVE_TRADES_PREFIX } from "./trade.constants.js";

async function applyRevShare(
  userId: string,
  tradeId: string,
  tradeAmount: number,
): Promise<void> {
  try {
    // Pre-check: avoid redundant DB write if earning already recorded
    const existing = await partnerEarningsRepository.findByTradeId(tradeId);
    if (existing) {
      logger.debug({ tradeId }, "RevShare: earning already recorded — skipping");
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user?.partnerId) return;

    const partner = await partnerRepository.findById(user.partnerId);
    if (!partner || partner.status !== "ACTIVE") return;

    const earning = tradeAmount * (partner.revsharePercent / 100);
    if (earning <= 0) return;

    await partnerEarningsRepository.createWithPartnerUpdate({
      partnerId: partner.id,
      userId,
      tradeId,
      amount: earning,
    });

    logger.info(
      { partnerId: partner.id, tradeId, earning, revsharePercent: partner.revsharePercent },
      "RevShare applied",
    );
  } catch (err) {
    // Unique constraint violation = already recorded (race condition) — safe to ignore
    const isUniqueViolation =
      err instanceof Error && err.message.includes("Unique constraint");
    if (isUniqueViolation) {
      logger.debug({ tradeId }, "RevShare: unique constraint — already recorded, skipping");
      return;
    }
    logger.error({ err, tradeId, userId }, "RevShare: failed to apply earning");
  }
}

export const tradeClosingService = {
  async closeTrade(tradeId: string): Promise<void> {
    // 1. Load trade
    const trade = await tradeRepository.findById(tradeId);
    if (!trade) {
      logger.warn({ tradeId }, "Trade not found for closing — skipping");
      return;
    }

    if (trade.status !== "OPEN") {
      logger.info({ tradeId, status: trade.status }, "Trade already closed — no-op");
      return;
    }

    // 2. Capture exit price from live price engine
    let exitPrice: number;
    try {
      exitPrice = priceProvider.getPrice(trade.instrumentId);
    } catch (err) {
      logger.error({ err, tradeId, instrumentId: trade.instrumentId }, "Exit price unavailable — closing as TIE");
      exitPrice = Number(trade.entryPrice);
    }

    // 3. Pure domain logic — determine outcome
    const result = determineResult(
      trade.direction,
      Number(trade.entryPrice),
      exitPrice,
    );

    const payoutAmount =
      result === "WIN"
        ? calculatePayoutAmount(Number(trade.amount), trade.payoutPercent)
        : 0;

    // WIN  → credit amount + payoutAmount back to user
    // TIE  → credit original amount back to user
    // LOSS → nothing credited
    const creditAmount =
      result === "WIN"
        ? Number(trade.amount) + payoutAmount
        : result === "TIE"
          ? Number(trade.amount)
          : 0;

    // 4. Atomic close: update trade + credit balance + ledger
    //    WHERE status='OPEN' ensures idempotency — if already closed, returns null.
    const closedAccount = await tradeRepository.closeTrade({
      tradeId,
      exitPrice,
      status: result,
      payoutAmount,
      closedAt: new Date(),
      accountId: trade.accountId,
      creditAmount,
    });

    // null means trade was already closed (idempotent no-op)
    if (closedAccount === null && creditAmount === 0) {
      // LOSS path or already-closed path — refetch to check
      const reTrade = await tradeRepository.findById(tradeId);
      if (reTrade && reTrade.status !== "OPEN") {
        // Trade was successfully closed (LOSS has no account update)
        const pnl = calculatePnl(result, Number(trade.amount), payoutAmount);
        logger.info({ tradeId, result, exitPrice, pnl }, "Trade closed");
        sendTradeClose(trade.userId, toTradeDTO(reTrade), pnl);

        // RevShare: ONLY on LOSS. Fire and forget — must never affect trade outcome.
        if (result === "LOSS") {
          setImmediate(() =>
            applyRevShare(trade.userId, tradeId, Number(trade.amount)),
          );
        }
      }
      // Remove from active set regardless
      await getRedis().srem(`${ACTIVE_TRADES_PREFIX}${trade.userId}`, tradeId);
      return;
    }

    // WIN or TIE path — closedAccount is the updated account
    const updatedTrade = await tradeRepository.findById(tradeId);
    if (!updatedTrade) return;

    const pnl = calculatePnl(result, Number(trade.amount), payoutAmount);
    logger.info({ tradeId, result, exitPrice, creditAmount, pnl }, "Trade closed");

    sendTradeClose(trade.userId, toTradeDTO(updatedTrade), pnl);
    if (closedAccount) {
      sendAccountSnapshot(trade.userId, toAccountDTO(closedAccount));
    }

    // 5. Remove from active trades set in Redis
    await getRedis().srem(`${ACTIVE_TRADES_PREFIX}${trade.userId}`, tradeId);
  },
};
