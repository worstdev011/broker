import type { FastifyInstance } from "fastify";
import { accountsController } from "./accounts.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

export async function accountsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/", accountsController.handleList);

  app.post("/switch", accountsController.handleSwitch);

  app.post("/demo/reset", accountsController.handleDemoReset);

  app.get("/snapshot", accountsController.handleSnapshot);
}
