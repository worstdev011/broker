import 'dotenv/config';

import { createApp } from './app.js';
import { bootstrapAll } from './bootstrap/index.js';
import { setupGracefulShutdown } from './utils/shutdown.js';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';

async function start() {
  try {
    logger.info('Starting server...');

    const app = await createApp();
    await bootstrapAll(app);
    setupGracefulShutdown(app);

    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`Server listening on ${address}`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

start();
