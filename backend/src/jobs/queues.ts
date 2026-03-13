import Bull from 'bull';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

export const QUEUE_NAMES = {
  TRADE_CLOSING: 'trade-closing',
  EMAIL: 'email',
  REPORTS: 'reports',
  CLEANUP: 'cleanup',
} as const;

const queues: Bull.Queue[] = [];

export function createTradeClosingQueue(): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  try {
    const queue = new Bull(QUEUE_NAMES.TRADE_CLOSING, env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
      },
    });

    queue.on('error', (err) => logger.error({ err }, 'Trade closing queue error'));
    queue.on('failed', (job, err) =>
      logger.error({ err, jobId: job?.id }, 'Trade closing job failed'),
    );

    queues.push(queue);
    return queue;
  } catch (err) {
    logger.error({ err }, 'Failed to create trade closing queue');
    return null;
  }
}

export function createEmailQueue(): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  try {
    const queue = new Bull(QUEUE_NAMES.EMAIL, env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 500,
      },
    });
    queues.push(queue);
    return queue;
  } catch (err) {
    logger.error({ err }, 'Failed to create email queue');
    return null;
  }
}

export function createCleanupQueue(): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  try {
    const queue = new Bull(QUEUE_NAMES.CLEANUP, env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: 50,
      },
    });
    queues.push(queue);
    return queue;
  } catch (err) {
    logger.error({ err }, 'Failed to create cleanup queue');
    return null;
  }
}

export function getQueues(): Bull.Queue[] {
  return queues;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(queues.map((q) => q.close()));
  queues.length = 0;
}
