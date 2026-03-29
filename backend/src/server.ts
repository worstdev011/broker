import "dotenv/config";
import { createApp } from "./app.js";
import { validateEnv, env } from "./shared/types/env.js";
import { bootstrapAll } from "./bootstrap/index.js";
import { disconnectDatabase } from "./bootstrap/database.js";
import { disconnectRedis } from "./bootstrap/redis.js";
import { shutdownPrices } from "./bootstrap/prices.bootstrap.js";
import { shutdownTrades } from "./bootstrap/trades.bootstrap.js";
import { shutdownWebSocketEvents } from "./bootstrap/websocket.bootstrap.js";

async function main(): Promise<void> {
  validateEnv();
  await bootstrapAll();

  const app = await createApp();
  const config = env();

  await app.listen({ port: config.PORT, host: "0.0.0.0" });

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully…`);
    try {
      await app.close();
      shutdownWebSocketEvents();
      await shutdownTrades();
      shutdownPrices();
      await disconnectRedis();
      await disconnectDatabase();
      app.log.info("Server closed");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
