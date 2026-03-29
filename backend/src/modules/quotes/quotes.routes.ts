import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { quotesController } from "./quotes.controller.js";

export async function quotesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/candles", { preHandler: [requireAuth] }, quotesController.candles);
}
