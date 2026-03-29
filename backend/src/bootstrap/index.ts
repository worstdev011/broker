import { logger } from "../shared/logger.js";
import { connectDatabase } from "./database.js";
import { connectRedis } from "./redis.js";
import { bootstrapPrices, getPriceEngineManager, getCandleAggregator } from "./prices.bootstrap.js";
import { bootstrapTrades } from "./trades.bootstrap.js";
import { bootstrapWebSocketEvents } from "./websocket.bootstrap.js";
import { bootstrapCleanup } from "./cleanup.bootstrap.js";

export async function bootstrapAll(): Promise<void> {
  logger.info("Bootstrapping services…");

  try {
    await connectDatabase();
  } catch {
    logger.fatal("Cannot start without database. Check DATABASE_URL in .env and that PostgreSQL is running.");
    process.exit(1);
  }

  try {
    await connectRedis();
  } catch {
    logger.fatal("Cannot start without Redis. Check REDIS_URL in .env and that Redis is running.");
    process.exit(1);
  }

  await bootstrapPrices();
  bootstrapTrades();

  const manager = getPriceEngineManager();
  const aggregator = getCandleAggregator();
  if (manager && aggregator) {
    bootstrapWebSocketEvents(manager, aggregator);
  }

  bootstrapCleanup();

  logger.info("All services bootstrapped");
}
