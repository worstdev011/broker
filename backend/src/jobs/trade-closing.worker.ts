import { Worker } from "bullmq";
import type { Job } from "bullmq";
import Redis from "ioredis";
import { env } from "../shared/types/env.js";
import {
  TRADE_CLOSING_QUEUE,
  TRADE_CLOSING_MAX_RETRIES,
  TRADE_CLOSING_BACKOFF_MS,
} from "../domain/trades/trade.constants.js";
import { tradeClosingService } from "../domain/trades/trade-closing.service.js";
import { logger } from "../shared/logger.js";

let worker: Worker | null = null;

export function startTradeClosingWorker(): void {
  const connection = new Redis(env().REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  worker = new Worker(
    TRADE_CLOSING_QUEUE,
    async (job: Job<{ tradeId: string }>) => {
      logger.info({ tradeId: job.data.tradeId, jobId: job.id }, "Processing trade close");
      await tradeClosingService.closeTrade(job.data.tradeId);
    },
    {
      connection,
      concurrency: 10,
    },
  );

  worker.on("completed", (job) => {
    logger.info(
      { tradeId: job.data.tradeId, jobId: job.id },
      "Trade close completed",
    );
  });

  worker.on("failed", (job, err) => {
    const attempts = job?.attemptsMade ?? 0;
    if (attempts >= TRADE_CLOSING_MAX_RETRIES) {
      logger.fatal(
        { tradeId: job?.data.tradeId, jobId: job?.id, err, attempts },
        "Trade close PERMANENTLY FAILED — requires manual review",
      );
    } else {
      logger.error(
        { tradeId: job?.data.tradeId, jobId: job?.id, err, attempts },
        "Trade close attempt failed, will retry",
      );
    }
  });

  logger.info(
    { queue: TRADE_CLOSING_QUEUE, backoffMs: TRADE_CLOSING_BACKOFF_MS },
    "Trade closing worker started",
  );
}

export async function stopTradeClosingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("Trade closing worker stopped");
  }
}
