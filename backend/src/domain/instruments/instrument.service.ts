import { instrumentRepository } from "../../infrastructure/prisma/instrument.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { Instrument } from "../../generated/prisma/client.js";

export interface InstrumentDTO {
  id: string;
  name: string;
  base: string;
  quote: string;
  type: "REAL" | "OTC";
  payoutPercent: number;
  isActive: boolean;
}

function toDTO(i: Instrument): InstrumentDTO {
  return {
    id: i.id,
    name: i.name,
    base: i.base,
    quote: i.quote,
    type: i.type,
    payoutPercent: i.payoutPercent,
    isActive: i.isActive,
  };
}

export function isMarketOpen(type: "REAL" | "OTC", now?: Date): boolean {
  if (type === "OTC") return true;
  const d = now ?? new Date();
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

export const instrumentService = {
  async listActive(): Promise<InstrumentDTO[]> {
    const instruments = await instrumentRepository.findAllActive();
    return instruments.map(toDTO);
  },

  async updatePayout(id: string, payoutPercent: number): Promise<InstrumentDTO> {
    if (payoutPercent < 60 || payoutPercent > 90) {
      throw AppError.badRequest("payoutPercent must be between 60 and 90");
    }

    const existing = await instrumentRepository.findById(id);
    if (!existing) throw AppError.notFound("Instrument not found");

    const updated = await instrumentRepository.updatePayout(id, payoutPercent);
    return toDTO(updated);
  },

  async toggleActive(id: string): Promise<InstrumentDTO> {
    const existing = await instrumentRepository.findById(id);
    if (!existing) throw AppError.notFound("Instrument not found");

    const updated = await instrumentRepository.toggleActive(id, !existing.isActive);
    return toDTO(updated);
  },
};
