import type { FastifyInstance } from "fastify";
import { tradesController } from "./trades.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

export async function tradesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.post(
    "/open",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
          keyGenerator: (request) => request.userId ?? request.ip,
        },
      },
    },
    tradesController.handleOpen,
  );

  app.get("/", tradesController.handleList);

  app.get("/statistics", tradesController.handleStatistics);

  app.get("/balance-history", tradesController.handleBalanceHistory);

  app.get("/analytics", tradesController.handleAnalytics);
}
