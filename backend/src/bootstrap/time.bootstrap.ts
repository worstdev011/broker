import { getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import { SystemClock } from '../infrastructure/time/SystemClock.js';
import { TimeService } from '../domain/time/TimeService.js';
import { logger } from '../shared/logger.js';

let countdownInterval: NodeJS.Timeout | null = null;
let timeService: TimeService | null = null;

const activeTradesCache = new Map<string, { userId: string; expiresAt: number }>();

const COUNTDOWN_INTERVAL_MS = 1_000;

export async function bootstrapTimeUpdates(): Promise<void> {
  if (countdownInterval) {
    logger.warn('Time updates already bootstrapped');
    return;
  }

  logger.info('Bootstrapping time updates...');

  const clock = new SystemClock();
  timeService = new TimeService(clock);

  countdownInterval = setInterval(async () => {
    try {
      await sendTradeCountdowns();
    } catch (error) {
      logger.error({ err: error }, 'Error in trade countdown update');
    }
  }, COUNTDOWN_INTERVAL_MS);

  logger.info('Time updates bootstrapped');
}

export async function shutdownTimeUpdates(): Promise<void> {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    timeService = null;
    activeTradesCache.clear();
    logger.info('Time updates shut down');
  }
}

export function registerTradeForCountdown(tradeId: string, userId: string, expiresAt: number): void {
  activeTradesCache.set(tradeId, { userId, expiresAt });
}

export function unregisterTradeFromCountdown(tradeId: string): void {
  activeTradesCache.delete(tradeId);
}

async function sendTradeCountdowns(): Promise<void> {
  if (!timeService) return;

  const wsManager = getWebSocketManager();

  for (const [tradeId, tradeInfo] of activeTradesCache.entries()) {
    const secondsLeft = timeService.secondsLeft(tradeInfo.expiresAt);

    if (secondsLeft > 0) {
      wsManager.sendToUser(tradeInfo.userId, {
        type: 'trade:countdown',
        data: { tradeId, secondsLeft },
      });
    } else {
      activeTradesCache.delete(tradeId);
    }
  }
}
