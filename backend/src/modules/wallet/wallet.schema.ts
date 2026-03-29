import { z } from "zod";

export const depositBodySchema = z.object({
  amount: z.number().min(1).max(100_000),
  accountId: z.string().min(1).optional(),
});

export const withdrawBodySchema = z.object({
  amount: z.number().min(10).max(50_000),
  accountId: z.string().min(1).optional(),
  cardNumber: z.string().min(13).max(19),
  twoFactorCode: z.string().length(6).optional(),
});

export const webhookBodySchema = z.object({
  order_id: z.string(),
  status: z.string(),
  amount: z.number().or(z.string()),
  sign: z.string().default(""),
  external_id: z.string().optional(),
  failure_reason: z.string().optional(),
}).passthrough();

export const transactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
