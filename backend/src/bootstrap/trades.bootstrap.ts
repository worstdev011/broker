import { startTradeClosingWorker, stopTradeClosingWorker } from "../jobs/trade-closing.worker.js";
import { closeQueues } from "../jobs/queues.js";
import { logger } from "../shared/logger.js";

export function bootstrapTrades(): void {
  startTradeClosingWorker();
  logger.info("Trade closing infrastructure started");
}

export async function shutdownTrades(): Promise<void> {
  await stopTradeClosingWorker();
  await closeQueues();
}
