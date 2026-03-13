import type { FastifyRequest, FastifyReply } from 'fastify';
import { TerminalSnapshotService } from '../../domain/terminal/TerminalSnapshotService.js';
import type { PriceEngineManager } from '../../prices/PriceEngineManager.js';
import { getTimeframeMs } from '../../prices/PriceTypes.js';
import type { Timeframe } from '../../prices/PriceTypes.js';
import { DEFAULT_INSTRUMENT_ID } from '../../config/instruments.js';

export class TerminalController {
  constructor(
    private snapshotService: TerminalSnapshotService,
    private getManager: () => PriceEngineManager,
  ) {}

  async getSnapshot(
    request: FastifyRequest<{
      Querystring: { instrument?: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const instrument = request.query.instrument || DEFAULT_INSTRUMENT_ID;

    const snapshot = await this.snapshotService.getSnapshot(userId, instrument);
    return reply.send(snapshot);
  }

  async getCandles(
    request: FastifyRequest<{
      Querystring: { instrument?: string; timeframe?: string; to?: string; limit?: string };
    }>,
    reply: FastifyReply,
  ) {
    const instrument = request.query.instrument || DEFAULT_INSTRUMENT_ID;
    const timeframe = (request.query.timeframe || '5s') as Timeframe;
    const toTime = request.query.to ? parseInt(request.query.to, 10) : Date.now();
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 200;

    if (isNaN(toTime) || isNaN(limit)) {
      return reply.status(400).send({ error: 'Invalid parameters: to and limit must be numbers' });
    }

    const candles = await this.getManager().getCandlesBefore(instrument, timeframe, toTime, limit);

    const tfMs = getTimeframeMs(timeframe);
    const items = candles.map((candle) => {
      const timestamp =
        typeof candle.timestamp === 'number'
          ? candle.timestamp
          : new Date(candle.timestamp).getTime();

      return {
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        startTime: timestamp,
        endTime: timestamp + tfMs,
      };
    });

    return reply.send({ items });
  }
}
