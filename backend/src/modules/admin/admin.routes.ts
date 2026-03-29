import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../middleware/admin.middleware.js";
import { adminController } from "./admin.controller.js";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: [requireAdmin] };

  // Dashboard
  app.get("/dashboard", guard, adminController.handleDashboard);

  // Users — list + detail
  app.get("/users", guard, adminController.handleListUsers);
  app.get("/users/:id", guard, adminController.handleGetUser);

  // Users — mutating actions
  app.patch("/users/:id/ban", guard, adminController.handleBanUser);
  app.patch("/users/:id/unban", guard, adminController.handleUnbanUser);
  app.patch("/users/:id/balance", guard, adminController.handleAdjustBalance);
  app.patch("/users/:id/kyc", guard, adminController.handleUpdateKyc);
  app.delete("/users/:id/sessions", guard, adminController.handleKillUserSessions);
  app.patch("/users/:id/reset-2fa", guard, adminController.handleReset2FA);

  // Trades — active must be before parameterised routes
  app.get("/trades/active", guard, adminController.handleActiveTrades);
  app.get("/trades", guard, adminController.handleListTrades);

  // Instruments (read-only; payout/toggle go through /api/instruments/:id/*)
  app.get("/instruments", guard, adminController.handleListInstruments);

  // WS sessions monitor
  app.get("/sessions", guard, adminController.handleSessions);

  // Partners — must put /withdrawals before /:id routes
  app.get("/partners/withdrawals", guard, adminController.handleListPartnerWithdrawals);
  app.patch("/partners/withdrawals/:id/pay", guard, adminController.handlePayWithdrawal);
  app.patch("/partners/withdrawals/:id/reject", guard, adminController.handleRejectWithdrawal);
  app.get("/partners", guard, adminController.handleListPartners);
  app.patch("/partners/:id/status", guard, adminController.handleSetPartnerStatus);
}
