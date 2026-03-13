import type { Instrument } from '../../domain/instruments/InstrumentTypes.js';

export interface InstrumentRepository {
  findAll(): Promise<Instrument[]>;
  findById(id: string): Promise<Instrument | null>;
  updatePayout(id: string, payoutPercent: number): Promise<void>;
}
