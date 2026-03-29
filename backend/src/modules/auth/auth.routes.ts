import type { FastifyInstance } from "fastify";
import { authController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get("/csrf", authController.handleCsrf);

  app.post(
    "/register",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 hour" },
      },
    },
    authController.handleRegister,
  );

  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "15 minutes" },
      },
    },
    authController.handleLogin,
  );

  app.post(
    "/2fa",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "5 minutes" },
      },
    },
    authController.handle2FA,
  );

  app.post("/logout", authController.handleLogout);

  app.get(
    "/me",
    { preHandler: [requireAuth] },
    authController.handleMe,
  );
}
