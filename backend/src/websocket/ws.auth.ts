import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "../infrastructure/prisma/client.js";

const SESSION_COOKIE_NAME = "session_token";

/**
 * Authenticate a WebSocket upgrade request by reading the signed
 * session cookie (parsed by @fastify/cookie on the upgrade request).
 * Returns userId on success; throws on failure (caller closes with 4001).
 */
export async function authenticateWebSocket(
  request: FastifyRequest,
): Promise<string> {
  const raw = request.cookies[SESSION_COOKIE_NAME];
  if (!raw) throw new Error("No session cookie");

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) {
    throw new Error("Invalid cookie signature");
  }

  const tokenHash = createHash("sha256")
    .update(unsigned.value)
    .digest("hex");

  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session) throw new Error("Session not found");
  if (session.expiresAt < new Date()) throw new Error("Session expired");

  return session.userId;
}
