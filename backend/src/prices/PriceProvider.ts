import { AppError } from "../shared/errors/AppError.js";
import type { PriceEngineManager } from "./PriceEngineManager.js";
import type { CandleAggregator, CandleData } from "./CandleAggregator.js";

let managerRef: PriceEngineManager | null = null;
let aggregatorRef: CandleAggregator | null = null;

export function initPriceProvider(
  manager: PriceEngineManager,
  aggregator: CandleAggregator,
): void {
  managerRef = manager;
  aggregatorRef = aggregator;
}

export const priceProvider = {
  getPrice(instrumentId: string): number {
    if (!managerRef) {
      throw new AppError("PRICE_ENGINE_NOT_READY", "Price engine not initialised", 503);
    }
    const price = managerRef.getPrice(instrumentId);
    if (price === undefined) {
      throw AppError.notFound(`No price available for ${instrumentId}`);
    }
    return price;
  },

  getActiveCandle(instrumentId: string, timeframe: string): CandleData | undefined {
    return aggregatorRef?.getActiveCandle(instrumentId, timeframe);
  },

  async getCandles(
    instrumentId: string,
    timeframe: string,
    limit = 100,
    to?: number,
  ): Promise<CandleData[]> {
    if (!aggregatorRef) {
      throw new AppError("PRICE_ENGINE_NOT_READY", "Price engine not initialised", 503);
    }

    if (to !== undefined) {
      return aggregatorRef.getCandlesFromDb(instrumentId, timeframe, limit, to);
    }

    const memory = aggregatorRef.getCandlesFromMemory(instrumentId, timeframe, limit);
    if (memory.length >= limit) return memory.slice(-limit);

    return aggregatorRef.getCandlesFromDb(instrumentId, timeframe, limit);
  },
};
