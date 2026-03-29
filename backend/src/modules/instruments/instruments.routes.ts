import type { FastifyInstance } from "fastify";
import { instrumentsController } from "./instruments.controller.js";
import { requireAdmin } from "../../middleware/admin.middleware.js";

export async function instrumentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", instrumentsController.handleList);

  app.patch(
    "/:id/payout",
    { preHandler: [requireAdmin] },
    instrumentsController.handleUpdatePayout,
  );

  app.patch(
    "/:id/toggle",
    { preHandler: [requireAdmin] },
    instrumentsController.handleToggle,
  );
}
