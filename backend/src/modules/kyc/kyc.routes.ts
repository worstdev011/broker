import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { kycController } from "./kyc.controller.js";

export async function kycRoutes(app: FastifyInstance): Promise<void> {
  app.post("/init", { preHandler: [requireAuth] }, kycController.init);
  app.post("/webhook", kycController.webhook);
}
