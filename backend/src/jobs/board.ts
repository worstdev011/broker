import type { FastifyInstance } from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { getQueues } from './queues.js';
import { logger } from '../shared/logger.js';

export async function registerBullBoard(app: FastifyInstance): Promise<void> {
  const queues = getQueues();
  if (queues.length === 0) {
    logger.info('Bull Board skipped - no queues');
    return;
  }

  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: queues.map((q) => new BullAdapter(q)),
    serverAdapter,
  });

  await app.register(serverAdapter.registerPlugin(), {
    prefix: '/api/queues',
  });

  logger.info('Bull Board registered at /api/queues');
}
