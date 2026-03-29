import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "../shared/types/env.js";
import { TRADE_CLOSING_QUEUE } from "../domain/trades/trade.constants.js";

let connection: Redis | null = null;
let tradeClosingQueue: Queue | null = null;

function getConnection(): Redis {
  if (!connection) {
    connection = new Redis(env().REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export function getTradeClosingQueue(): Queue {
  if (!tradeClosingQueue) {
    tradeClosingQueue = new Queue(TRADE_CLOSING_QUEUE, {
      connection: getConnection(),
    });
  }
  return tradeClosingQueue;
}

export async function closeQueues(): Promise<void> {
  if (tradeClosingQueue) {
    await tradeClosingQueue.close();
    tradeClosingQueue = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}
