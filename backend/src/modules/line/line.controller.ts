import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../infrastructure/prisma/client.js";
import { priceProvider } from "../../prices/PriceProvider.js";
import { z } from "zod";

const snapshotQuerySchema = z.object({
  symbol: z.string().min(1),
});

const historyQuerySchema = z.object({
  symbol: z.string().min(1),
  to: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(300),
});

export const lineController = {
  async snapshot(request: FastifyRequest, reply: FastifyReply) {
    const query = snapshotQuerySchema.parse(request.query);

    const points = await prisma.pricePoint
      .findMany({
        where: { symbol: query.symbol },
        orderBy: { timestamp: "desc" },
        take: 1500,
      })
      .then((rows) =>
        rows.reverse().map((r) => ({
          time: Number(r.timestamp),
          price: Number(r.price),
        })),
      );

    let currentPrice: number | null = null;
    try {
      currentPrice = priceProvider.getPrice(query.symbol);
    } catch {
      /* no price yet */
    }

    return reply.send({
      points,
      currentPrice,
      serverTime: Date.now(),
    });
  },

  async history(request: FastifyRequest, reply: FastifyReply) {
    const query = historyQuerySchema.parse(request.query);

    const points = await prisma.pricePoint
      .findMany({
        where: {
          symbol: query.symbol,
          timestamp: { lt: BigInt(query.to ?? Date.now()) },
        },
        orderBy: { timestamp: "desc" },
        take: query.limit,
      })
      .then((rows) =>
        rows.reverse().map((r) => ({
          time: Number(r.timestamp),
          price: Number(r.price),
        })),
      );

    return reply.send({ points });
  },
};
