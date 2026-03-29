import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { lineController } from "./line.controller.js";

export async function lineRoutes(app: FastifyInstance): Promise<void> {
  app.get("/snapshot", { preHandler: [requireAuth] }, lineController.snapshot);
  app.get("/history", { preHandler: [requireAuth] }, lineController.history);
}
