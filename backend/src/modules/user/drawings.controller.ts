import type { FastifyRequest, FastifyReply } from "fastify";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { drawingBodySchema, updateDrawingSchema } from "./user.schema.js";
import { AppError } from "../../shared/errors/AppError.js";

export const drawingsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { instrument } = request.query as { instrument?: string };
    const userId = request.userId!;

    const drawings = await prisma.drawing.findMany({
      where: { userId, ...(instrument ? { instrument } : {}) },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      drawings: drawings.map((d) => ({
        id: d.id,
        instrument: d.instrument,
        type: d.type,
        data: d.data,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = drawingBodySchema.parse(request.body);
    const userId = request.userId!;

    const drawing = await prisma.drawing.create({
      data: {
        userId,
        instrument: body.instrument,
        type: body.type,
        data: body.data as Prisma.InputJsonValue,
      },
    });

    return reply.status(201).send({
      drawing: {
        id: drawing.id,
        instrument: drawing.instrument,
        type: drawing.type,
        data: drawing.data,
        createdAt: drawing.createdAt.toISOString(),
        updatedAt: drawing.updatedAt.toISOString(),
      },
    });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = updateDrawingSchema.parse(request.body);
    const userId = request.userId!;

    const existing = await prisma.drawing.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw AppError.notFound("Drawing not found");
    }

    const drawing = await prisma.drawing.update({
      where: { id },
      data: { data: body.data as Prisma.InputJsonValue },
    });

    return reply.send({
      drawing: {
        id: drawing.id,
        instrument: drawing.instrument,
        type: drawing.type,
        data: drawing.data,
        createdAt: drawing.createdAt.toISOString(),
        updatedAt: drawing.updatedAt.toISOString(),
      },
    });
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const userId = request.userId!;

    const existing = await prisma.drawing.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw AppError.notFound("Drawing not found");
    }

    await prisma.drawing.delete({ where: { id } });
    return reply.status(204).send();
  },
};
