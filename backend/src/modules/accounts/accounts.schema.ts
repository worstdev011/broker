import { z } from "zod";

export const switchBodySchema = z.object({
  accountId: z.string().min(1),
});

export const snapshotQuerySchema = z.object({
  type: z.enum(["DEMO", "REAL"]).optional(),
});

export type SwitchBody = z.infer<typeof switchBodySchema>;
export type SnapshotQuery = z.infer<typeof snapshotQuerySchema>;
