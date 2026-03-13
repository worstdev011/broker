import { getPrismaClient } from '../bootstrap/database.js';
import { logger } from '../shared/logger.js';

/**
 * PricePointWriter stores each tick as a single row in the database.
 * The renderer draws horizontal extensions between ticks on-the-fly,
 * so no bridge points are needed — one tick = one DB row.
 */
export class PricePointWriter {
  private lastTimestamp = new Map<string, number>();
  private modelWarned = false;
  private tableWarned = false;
  private lastErrorTime = new Map<string, number>();

  async handleTick(instrumentId: string, price: number, time: number): Promise<void> {
    const ts = Math.round(time);
    const lastTs = this.lastTimestamp.get(instrumentId);

    if (lastTs === ts) return;

    this.lastTimestamp.set(instrumentId, ts);

    const prisma = getPrismaClient();
    if (!('pricePoint' in prisma)) {
      if (!this.modelWarned) {
        logger.warn('PricePoint model not available — run "npx prisma generate"');
        this.modelWarned = true;
      }
      return;
    }

    try {
      await (prisma as any).pricePoint.upsert({
        where: {
          symbol_timestamp: {
            symbol: instrumentId,
            timestamp: BigInt(ts),
          },
        },
        update: { price },
        create: {
          symbol: instrumentId,
          timestamp: BigInt(ts),
          price,
        },
      });
    } catch (error: any) {
      const errorMessage = error?.message || String(error);

      if (
        errorMessage.includes('does not exist') ||
        (errorMessage.includes('table') && errorMessage.includes('price_points'))
      ) {
        if (!this.tableWarned) {
          logger.debug('Table price_points does not exist yet — migration needed');
          this.tableWarned = true;
        }
        return;
      }

      const now = Date.now();
      const lastTime = this.lastErrorTime.get(instrumentId) ?? 0;
      if (now - lastTime > 60_000) {
        logger.error({ err: errorMessage, instrumentId }, 'Failed to write price point');
        this.lastErrorTime.set(instrumentId, now);
      }
    }
  }

  clearCache(): void {
    this.lastTimestamp.clear();
    this.lastErrorTime.clear();
  }
}
