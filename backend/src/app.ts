import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import csrf from "@fastify/csrf-protection";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { env } from "./shared/types/env";
import { AppError } from "./shared/errors/AppError";
import { healthRoutes } from "./modules/health/health.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { accountsRoutes } from "./modules/accounts/accounts.routes";
import { tradesRoutes } from "./modules/trades/trades.routes";
import { terminalRoutes } from "./modules/terminal/terminal.routes";
import { userRoutes } from "./modules/user/user.routes";
import { walletRoutes } from "./modules/wallet/wallet.routes";
import { instrumentsRoutes } from "./modules/instruments/instruments.routes";
import { kycRoutes } from "./modules/kyc/kyc.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { quotesRoutes } from "./modules/quotes/quotes.routes";
import { lineRoutes } from "./modules/line/line.routes";
import { wsRoutes } from "./websocket/ws.routes";
import { partnersRoutes } from "./modules/partners/partners.routes";

const CSRF_SKIP_PATHS = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/2fa",
  "/api/wallet/webhook",
  "/api/kyc/webhook",
  "/api/kyc/init",
  "/api/partners/register",
  "/api/partners/login",
  "/api/partners/logout",
  "/api/partners/track-click",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function createApp(): Promise<FastifyInstance> {
  const config = env();

  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      transport:
        config.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
    },
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  // ─── Plugins ─────────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: [config.FRONTEND_URL, config.ADMIN_URL, config.PARTNERS_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-csrf-token", "x-request-id"],
  });

  await app.register(cookie, {
    secret: config.SESSION_SECRET,
    parseOptions: {},
  });

  await app.register(csrf, {
    sessionPlugin: "@fastify/cookie",
    cookieOpts: { signed: true, httpOnly: true, sameSite: "strict", path: "/" },
    getToken: (request) => request.headers["x-csrf-token"] as string,
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === "production",
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
      files: 1,
    },
  });

  await app.register(websocket);

  // ─── Raw body capture for webhook signature verification ────────────────────

  app.addHook("preParsing", async (request, _reply, payload) => {
    const path = request.url.split("?")[0];
    if (path !== "/api/kyc/webhook" && path !== "/api/wallet/webhook") {
      return;
    }

    const { Readable } = await import("node:stream");
    const chunks: Buffer[] = [];
    for await (const chunk of payload) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks);
    (request as any).rawBody = raw;
    return Readable.from(raw);
  });

  // ─── CSRF enforcement (global, with skip list) ───────────────────────────────

  app.addHook("onRequest", (request, reply, done) => {
    if (!MUTATING_METHODS.has(request.method)) { done(); return; }

    const path = request.url.split("?")[0];
    if (CSRF_SKIP_PATHS.some((skip) => path === skip)) { done(); return; }

    // @fastify/csrf-protection requires the callback (done) as third argument
    (app as any).csrfProtection(request, reply, done);
  });

  // ─── Error handler (section 3.7) ─────────────────────────────────────────────
  // NEVER returns stack traces or internal details to the client.

  app.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn(
        { err: error, userId: request.userId, code: error.code },
        error.message,
      );
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    // Fastify validation errors (Zod / schema)
    if ("validation" in error && (error as FastifyError).statusCode === 400) {
      request.log.warn({ err: error, userId: request.userId }, "Validation error");
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: error.message,
      });
    }

    // Rate limit errors
    if ((error as FastifyError).statusCode === 429) {
      return reply.status(429).send({
        error: "RATE_LIMIT",
        message: "Too many requests",
      });
    }

    // CSRF errors
    if (error.message?.includes("csrf") || error.message?.includes("CSRF")) {
      request.log.warn({ err: error, userId: request.userId }, "CSRF validation failed");
      return reply.status(403).send({
        error: "CSRF_FAILED",
        message: "Invalid or missing CSRF token",
      });
    }

    // Unknown errors — log full details, return nothing sensitive
    request.log.error(
      { err: error, userId: request.userId, url: request.url, method: request.method },
      "Unhandled error",
    );

    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });

  // ─── Routes ──────────────────────────────────────────────────────────────────

  await app.register(healthRoutes, { prefix: "/api/health" });
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(accountsRoutes, { prefix: "/api/accounts" });
  await app.register(tradesRoutes, { prefix: "/api/trades" });
  await app.register(terminalRoutes, { prefix: "/api/terminal" });
  await app.register(userRoutes, { prefix: "/api/user" });
  await app.register(walletRoutes, { prefix: "/api/wallet" });
  await app.register(instrumentsRoutes, { prefix: "/api/instruments" });
  await app.register(kycRoutes, { prefix: "/api/kyc" });
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(quotesRoutes, { prefix: "/api/quotes" });
  await app.register(lineRoutes, { prefix: "/api/line" });
  await app.register(partnersRoutes, { prefix: "/api/partners" });
  await app.register(wsRoutes);

  return app;
}
