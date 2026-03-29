import type { FastifyRequest, FastifyReply } from "fastify";
import { priceProvider } from "../../prices/PriceProvider.js";
import { z } from "zod";

const candlesQuerySchema = z.object({
  instrument: z.string().min(1),
  timeframe: z.string().min(1).default("1m"),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
  to: z.coerce.number().int().optional(),
});

export const quotesController = {
  async candles(request: FastifyRequest, reply: FastifyReply) {
    const query = candlesQuerySchema.parse(request.query);

    const candles = await priceProvider.getCandles(
      query.instrument,
      query.timeframe,
      query.limit,
      query.to,
    );

    return reply.send({ items: candles });
  },
};
