import { prisma } from "../infrastructure/prisma/client.js";
import { logger } from "../shared/logger.js";

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connected successfully");
  } catch (error) {
    logger.fatal({ err: error }, "Failed to connect to database");
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected");
  } catch (error) {
    logger.error({ err: error }, "Error disconnecting from database");
  }
}
