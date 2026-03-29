import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../infrastructure/prisma/client";
import { AppError } from "../shared/errors/AppError";
import { requireAuth } from "./auth.middleware";

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);

  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw AppError.forbidden();
  }

  request.userRole = "ADMIN";
}
