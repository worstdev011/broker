import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { chartSettingsController } from "./chart-settings.controller.js";

export async function chartSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/", chartSettingsController.get);
  app.put("/", chartSettingsController.update);
}
