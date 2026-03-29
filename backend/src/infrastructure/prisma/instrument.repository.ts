import type { Instrument } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";

export const instrumentRepository = {
  async findAllActive(): Promise<Instrument[]> {
    return prisma.instrument.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  async findAll(): Promise<Instrument[]> {
    return prisma.instrument.findMany({ orderBy: { sortOrder: "asc" } });
  },

  async findById(id: string): Promise<Instrument | null> {
    return prisma.instrument.findUnique({ where: { id } });
  },

  async updatePayout(id: string, payoutPercent: number): Promise<Instrument> {
    return prisma.instrument.update({
      where: { id },
      data: { payoutPercent },
    });
  },

  async toggleActive(id: string, isActive: boolean): Promise<Instrument> {
    return prisma.instrument.update({
      where: { id },
      data: { isActive },
    });
  },
};
