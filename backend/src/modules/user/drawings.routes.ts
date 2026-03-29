import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { drawingsController } from "./drawings.controller.js";

export async function drawingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/", drawingsController.list);
  app.post("/", drawingsController.create);
  app.put("/:id", drawingsController.update);
  app.delete("/:id", drawingsController.remove);
}
