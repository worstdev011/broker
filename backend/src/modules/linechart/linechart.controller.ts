import type { FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../bootstrap/database.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { DEFAULT_INSTRUMENT_ID } from '../../config/instruments.js';
import { logger } from '../../shared/logger.js';

export class LineChartController {
  async getSnapshot(
    request: FastifyRequest<{ Querystring: { symbol?: string } }>,
    reply: FastifyReply,
  ) {
    const instrumentId = request.query.symbol || DEFAULT_INSTRUMENT_ID;
    const prisma = getPrismaClient();

    if (!('pricePoint' in prisma)) {
      const manager = getPriceEngineManager();
      const currentPriceTick = await manager.getCurrentPrice(instrumentId);
      return reply.send({
        points: [],
        currentPrice: currentPriceTick?.price ?? 0,
        serverTime: Date.now(),
      });
    }

    const pricePoints = await (prisma as any).pricePoint.findMany({
      where: { symbol: instrumentId },
      orderBy: { timestamp: 'desc' },
      take: 1500,
    }).catch((error: any) => {
      const msg = error?.message || String(error);
      if (msg.includes('does not exist') || msg.includes('table')) {
        logger.debug('Table price_points does not exist yet, returning empty snapshot');
        return [];
      }
      throw error;
    });

    const points = pricePoints.reverse().map((pp: any) => ({
      time: Number(pp.timestamp),
      price: Number(pp.price),
    }));

    const manager = getPriceEngineManager();
    const currentPriceTick = await manager.getCurrentPrice(instrumentId);
    const currentPrice = currentPriceTick?.price ?? points[points.length - 1]?.price ?? 0;

    return reply.send({ points, currentPrice, serverTime: Date.now() });
  }

  async getHistory(
    request: FastifyRequest<{ Querystring: { symbol?: string; to?: string; limit?: string } }>,
    reply: FastifyReply,
  ) {
    const instrumentId = request.query.symbol || DEFAULT_INSTRUMENT_ID;
    const toTime = request.query.to ? parseInt(request.query.to, 10) : Date.now();
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 300;

    if (isNaN(toTime) || isNaN(limit)) {
      return reply.status(400).send({ error: 'Invalid parameters: to and limit must be numbers' });
    }

    const prisma = getPrismaClient();

    if (!('pricePoint' in prisma)) {
      return reply.send({ points: [] });
    }

    const pricePoints = await (prisma as any).pricePoint.findMany({
      where: {
        symbol: instrumentId,
        timestamp: { lt: BigInt(toTime) },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    }).catch((error: any) => {
      const msg = error?.message || String(error);
      if (msg.includes('does not exist') || msg.includes('table')) {
        logger.debug('Table price_points does not exist yet, returning empty history');
        return [];
      }
      throw error;
    });

    const points = pricePoints.reverse().map((pp: any) => ({
      time: Number(pp.timestamp),
      price: Number(pp.price),
    }));

    return reply.send({ points });
  }
}
