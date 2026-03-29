import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { walletController } from "./wallet.controller.js";

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  app.post("/deposit", { preHandler: [requireAuth] }, walletController.deposit);
  app.post("/withdraw", { preHandler: [requireAuth] }, walletController.withdraw);
  app.post("/webhook", walletController.webhook);
  app.get("/balance", { preHandler: [requireAuth] }, walletController.balance);
  app.get("/transactions", { preHandler: [requireAuth] }, walletController.transactions);
}
