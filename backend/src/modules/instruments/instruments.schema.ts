import { z } from "zod";

export const updatePayoutBodySchema = z.object({
  payoutPercent: z.number().int().min(60).max(90),
});

export const instrumentParamsSchema = z.object({
  id: z.string().min(1),
});

export type UpdatePayoutBody = z.infer<typeof updatePayoutBodySchema>;
export type InstrumentParams = z.infer<typeof instrumentParamsSchema>;
