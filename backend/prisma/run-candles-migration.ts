/**
 * Одноразовый скрипт: обновить symbol в candles и price_points (EURUSD → EURUSD_OTC).
 * Запуск: npx tsx prisma/run-candles-migration.ts
 * После успешного выполнения: npx prisma migrate resolve --applied "20260215100000_rename_candles_price_points_symbols"
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const candles = await prisma.$executeRawUnsafe(`
    UPDATE "candles"
    SET "symbol" = "symbol" || '_OTC'
    WHERE "symbol" NOT LIKE '%_REAL'
      AND "symbol" NOT LIKE '%_OTC'
      AND "symbol" NOT LIKE '%/%'
  `);
  const pricePoints = await prisma.$executeRawUnsafe(`
    UPDATE "price_points"
    SET "symbol" = "symbol" || '_OTC'
    WHERE "symbol" NOT LIKE '%_REAL'
      AND "symbol" NOT LIKE '%_OTC'
      AND "symbol" NOT LIKE '%/%'
  `);
  console.log('candles updated:', candles);
  console.log('price_points updated:', pricePoints);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
