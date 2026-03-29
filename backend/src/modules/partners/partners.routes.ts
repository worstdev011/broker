import type { FastifyInstance } from "fastify";
import { partnersController } from "./partners.controller.js";
import { requirePartnerAuth } from "../../middleware/partner-auth.middleware.js";

export async function partnersRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/register",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 hour" },
      },
    },
    partnersController.handleRegister,
  );

  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "15 minutes" },
      },
    },
    partnersController.handleLogin,
  );

  app.post("/logout", partnersController.handleLogout);

  app.get(
    "/me",
    { preHandler: [requirePartnerAuth] },
    partnersController.handleMe,
  );

  app.post("/track-click", partnersController.handleTrackClick);

  app.get(
    "/dashboard",
    { preHandler: [requirePartnerAuth] },
    partnersController.handleDashboard,
  );

  app.get(
    "/referrals",
    { preHandler: [requirePartnerAuth] },
    partnersController.handleReferrals,
  );

  app.get(
    "/earnings",
    { preHandler: [requirePartnerAuth] },
    partnersController.handleEarnings,
  );

  app.get(
    "/withdrawals",
    { preHandler: [requirePartnerAuth] },
    partnersController.handleGetWithdrawals,
  );

  app.post(
    "/withdrawals",
    { preHandler: [requirePartnerAuth] },
    partnersController.handleRequestWithdrawal,
  );
}
