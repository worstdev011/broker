import { instrumentRepository } from "../infrastructure/prisma/instrument.repository.js";
import { PriceEngineManager } from "../prices/PriceEngineManager.js";
import { CandleAggregator } from "../prices/CandleAggregator.js";
import { initPriceProvider } from "../prices/PriceProvider.js";
import { logger } from "../shared/logger.js";

let manager: PriceEngineManager | null = null;
let aggregator: CandleAggregator | null = null;

export async function bootstrapPrices(): Promise<void> {
  const instruments = await instrumentRepository.findAllActive();
  if (instruments.length === 0) {
    logger.warn("No active instruments found — price engines not started");
    return;
  }

  manager = new PriceEngineManager();
  aggregator = new CandleAggregator(manager);

  initPriceProvider(manager, aggregator);

  manager.start(
    instruments.map((i) => ({ id: i.id, type: i.type })),
  );

  logger.info(
    { instruments: instruments.map((i) => i.id) },
    "Price engines bootstrapped",
  );
}

export function getPriceEngineManager(): PriceEngineManager | null {
  return manager;
}

export function getCandleAggregator(): CandleAggregator | null {
  return aggregator;
}

export function shutdownPrices(): void {
  manager?.stop();
  manager = null;
  aggregator = null;
}
