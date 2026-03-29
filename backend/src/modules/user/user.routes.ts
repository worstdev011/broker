import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { userController } from "./user.controller.js";
import { drawingsRoutes } from "./drawings.routes.js";
import { chartSettingsRoutes } from "./chart-settings.routes.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/profile", { preHandler: [requireAuth] }, userController.getProfile);
  app.patch("/profile", { preHandler: [requireAuth] }, userController.updateProfile);
  app.delete("/profile", { preHandler: [requireAuth] }, userController.deleteProfile);

  app.post("/avatar", { preHandler: [requireAuth] }, userController.uploadAvatar);
  app.delete("/avatar", { preHandler: [requireAuth] }, userController.deleteAvatar);

  app.post("/change-password", { preHandler: [requireAuth] }, userController.changePassword);
  app.post("/set-password", { preHandler: [requireAuth] }, userController.setPassword);

  app.get("/sessions", { preHandler: [requireAuth] }, userController.getSessions);
  app.delete("/sessions/others", { preHandler: [requireAuth] }, userController.deleteOtherSessions);
  app.delete("/sessions/:id", { preHandler: [requireAuth] }, userController.deleteSession);

  app.post("/2fa/enable", { preHandler: [requireAuth] }, userController.enable2FA);
  app.post("/2fa/verify", { preHandler: [requireAuth] }, userController.verify2FA);
  app.post("/2fa/disable", { preHandler: [requireAuth] }, userController.disable2FA);

  await app.register(drawingsRoutes, { prefix: "/drawings" });
  await app.register(chartSettingsRoutes, { prefix: "/chart-settings" });
}
