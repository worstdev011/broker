import { getPrismaClient } from '../../bootstrap/database.js';
import type { InstrumentRepository } from '../../ports/repositories/InstrumentRepository.js';
import type { Instrument } from '../../domain/instruments/InstrumentTypes.js';
import { INSTRUMENTS } from '../../config/instruments.js';
import { AppError } from '../../shared/errors/AppError.js';

export class PrismaInstrumentRepository implements InstrumentRepository {
  async findAll(): Promise<Instrument[]> {
    const prisma = getPrismaClient();
    const dbInstruments = await prisma.instrument.findMany();

    return Object.values(INSTRUMENTS).map((config) => {
      const dbInst = dbInstruments.find((db) => db.id === config.id);
      return {
        id: config.id,
        base: config.base,
        quote: config.quote,
        digits: config.digits,
        payoutPercent: dbInst?.payoutPercent ?? 75,
      };
    });
  }

  async findById(id: string): Promise<Instrument | null> {
    const config = INSTRUMENTS[id];
    if (!config) return null;

    const prisma = getPrismaClient();
    const dbInst = await prisma.instrument.findUnique({ where: { id } });

    return {
      id: config.id,
      base: config.base,
      quote: config.quote,
      digits: config.digits,
      payoutPercent: dbInst?.payoutPercent ?? 75,
    };
  }

  async updatePayout(id: string, payoutPercent: number): Promise<void> {
    if (payoutPercent < 60 || payoutPercent > 90) {
      throw new AppError(400, 'Payout percent must be between 60 and 90', 'INVALID_PAYOUT');
    }

    const config = INSTRUMENTS[id];
    const prisma = getPrismaClient();

    await prisma.instrument.upsert({
      where: { id },
      update: { payoutPercent },
      create: {
        id,
        name: `${config?.base ?? ''} / ${config?.quote ?? ''}`,
        base: config?.base ?? '',
        quote: config?.quote ?? '',
        payoutPercent,
      },
    });
  }
}
