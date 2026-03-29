import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { terminalController } from "./terminal.controller.js";

export async function terminalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/snapshot", { preHandler: [requireAuth] }, terminalController.snapshot);
}
