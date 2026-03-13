import { TradeClosingService } from '../domain/trades/TradeClosingService.js';
import { PriceServiceAdapter } from '../infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from './prices.bootstrap.js';
import { logger } from '../shared/logger.js';
import { createTradeClosingQueue, closeAllQueues } from '../jobs/queues.js';
import { env } from '../config/env.js';
import { getTradeRepository, getAccountRepository, getAccountService } from '../shared/serviceFactory.js';
import { TRADE_CLOSING_INTERVAL_MS } from '../config/constants.js';

let closingService: TradeClosingService | null = null;
let closingInterval: NodeJS.Timeout | null = null;
let tradeClosingQueue: ReturnType<typeof createTradeClosingQueue> = null;

export async function bootstrapTrades(): Promise<void> {
  if (closingInterval || tradeClosingQueue) {
    logger.warn('Trade closing runner already started');
    return;
  }

  logger.info('Bootstrapping trade closing service...');

  const tradeRepository = getTradeRepository();
  const accountRepository = getAccountRepository();
  const accountService = getAccountService();

  const manager = getPriceEngineManager();
  const priceProvider = new PriceServiceAdapter(manager);
  closingService = new TradeClosingService(
    tradeRepository,
    accountRepository,
    priceProvider,
    accountService,
  );

  if (env.REDIS_URL) {
    const queue = createTradeClosingQueue();
    if (queue) {
      tradeClosingQueue = queue;

      queue.process(async () => {
        if (!closingService) return;
        try {
          await closingService.closeExpiredTrades();
        } catch (error) {
          logger.error({ err: error }, 'Error in trade closing job');
          throw error;
        }
      });

      await queue.add({}, { repeat: { every: TRADE_CLOSING_INTERVAL_MS } });
      logger.info('Trade closing service bootstrapped (Bull queue)');
    } else {
      logger.warn('Bull queue creation failed, falling back to setInterval');
      startSetIntervalRunner();
    }
  } else {
    logger.info('REDIS_URL not set, using setInterval for trade closing');
    startSetIntervalRunner();
  }

  if (!tradeClosingQueue && !closingInterval) {
    logger.warn('Trade closing runner not started');
  }
}

function startSetIntervalRunner(): void {
  closingInterval = setInterval(async () => {
    if (!closingService) return;
    try {
      await closingService.closeExpiredTrades();
    } catch (error) {
      logger.error({ err: error }, 'Error in trade closing runner');
    }
  }, TRADE_CLOSING_INTERVAL_MS);
  logger.info('Trade closing service bootstrapped (setInterval)');
}

export async function shutdownTrades(): Promise<void> {
  if (closingInterval) {
    clearInterval(closingInterval);
    closingInterval = null;
  }

  if (tradeClosingQueue) {
    tradeClosingQueue = null;
  }

  await closeAllQueues();
  closingService = null;
  logger.info('Trade closing service shut down');
}
