/**
 * Terminal controller - handles HTTP requests
 * FLOW P4: instrument query param (default EURUSD_OTC), snapshot includes instrument
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { TerminalSnapshotService } from '../../domain/terminal/TerminalSnapshotService.js';
import type { Timeframe } from '../../prices/PriceTypes.js';
import type { PriceEngineManager } from '../../prices/PriceEngineManager.js';
import { DEFAULT_INSTRUMENT_ID } from '../../config/instruments.js';
import { logger } from '../../shared/logger.js';

export class TerminalController {
  constructor(
    private snapshotService: TerminalSnapshotService,
    private getManager: () => PriceEngineManager,
  ) {}

  async getSnapshot(
    request: FastifyRequest<{
      Querystring: {
        instrument?: string;
        timeframe?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!;
      const instrument = request.query.instrument || DEFAULT_INSTRUMENT_ID;
      const timeframe = (request.query.timeframe || '5s') as Timeframe;

      const snapshot = await this.snapshotService.getSnapshot(userId, instrument, timeframe);

      return reply.send(snapshot);
    } catch (error) {
      logger.error('Get snapshot error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get historical candles before a specific time (FLOW G6)
   * FLOW P4: instrument query param
   */
  async getCandles(
    request: FastifyRequest<{
      Querystring: {
        instrument?: string;
        timeframe?: string;
        to?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const instrument = request.query.instrument || DEFAULT_INSTRUMENT_ID;
      const timeframe = (request.query.timeframe || '5s') as Timeframe;
      const toTime = request.query.to ? parseInt(request.query.to, 10) : Date.now();
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 200;

      if (isNaN(toTime) || isNaN(limit)) {
        return reply.status(400).send({
          error: 'Invalid parameters: to and limit must be numbers',
        });
      }

      const candles = await this.getManager().getCandlesBefore(
        instrument,
        timeframe,
        toTime,
        limit,
      );

      const timeframeMs = this.getTimeframeMs(timeframe);
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
          endTime: timestamp + timeframeMs,
        };
      });

      return reply.send({ items });
    } catch (error) {
      logger.error('Get candles error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  private getTimeframeMs(timeframe: Timeframe): number {
    const timeframeSeconds: Record<Timeframe, number> = {
      '5s': 5,
      '10s': 10,
      '15s': 15,
      '30s': 30,
      '1m': 60,
      '2m': 120,
      '3m': 180,
      '5m': 300,
      '10m': 600,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };
    return timeframeSeconds[timeframe] * 1000;
  }
}
