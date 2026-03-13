import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

let prismaClient: PrismaClient | null = null;

export async function connectDatabase(): Promise<PrismaClient> {
  if (prismaClient) {
    return prismaClient;
  }

  logger.info('Connecting to PostgreSQL...');

  prismaClient = new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
    datasources: {
      db: { url: env.DATABASE_URL },
    },
  });

  try {
    await prismaClient.$connect();
    logger.info('PostgreSQL connected');
    return prismaClient;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to PostgreSQL');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
    logger.info('PostgreSQL disconnected');
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return prismaClient;
}
