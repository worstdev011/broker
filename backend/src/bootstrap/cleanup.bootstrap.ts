import { prisma } from "../infrastructure/prisma/client.js";
import { logger } from "../shared/logger.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 60 * 60 * 1000; // 1 hour after start

let initialTimer: ReturnType<typeof setTimeout> | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;

async function cleanOldPricePoints(): Promise<void> {
  const sevenDaysAgo = BigInt(Date.now() - SEVEN_DAYS_MS);
  try {
    const result = await prisma.pricePoint.deleteMany({
      where: { timestamp: { lt: sevenDaysAgo } },
    });
    logger.info({ deleted: result.count }, "Cleaned up old price points");
  } catch (err) {
    logger.warn({ err }, "Failed to cleanup price points");
  }
}

export function bootstrapCleanup(): void {
  initialTimer = setTimeout(() => {
    cleanOldPricePoints();
    intervalTimer = setInterval(cleanOldPricePoints, TWENTY_FOUR_HOURS_MS);
  }, FIRST_RUN_DELAY_MS);

  logger.info("Price point cleanup scheduled (first run in 1h, then every 24h)");
}

export function shutdownCleanup(): void {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
