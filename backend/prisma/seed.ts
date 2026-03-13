import { PrismaClient } from '@prisma/client';
import { INSTRUMENTS } from '../src/config/instruments.js';

const prisma = new PrismaClient();

/** Deterministic payout based on instrument ID (hash → 60–90%) */
function getPayoutForInstrument(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return 60 + (Math.abs(hash) % 31); // 60–90
}

async function main() {
  console.log('Seeding database...');

  for (const [id, config] of Object.entries(INSTRUMENTS)) {
    const payoutPercent = getPayoutForInstrument(id);

    await prisma.instrument.upsert({
      where: { id },
      update: {
        name: `${config.base} / ${config.quote}`,
        base: config.base,
        quote: config.quote,
        isActive: true,
        // payoutPercent intentionally not overwritten on update
      },
      create: {
        id,
        name: `${config.base} / ${config.quote}`,
        base: config.base,
        quote: config.quote,
        payoutPercent,
        isActive: true,
      },
    });

    console.log(`  ${id}: ${payoutPercent}%`);
  }

  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
