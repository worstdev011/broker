import { z } from "zod";
import {
  MIN_TRADE_AMOUNT,
  MAX_TRADE_AMOUNT,
  MIN_EXPIRATION_SECONDS,
  MAX_EXPIRATION_SECONDS,
  EXPIRATION_STEP_SECONDS,
} from "../../domain/trades/trade.constants.js";

export const openTradeBodySchema = z.object({
  accountId: z.string().min(1),
  direction: z.enum(["CALL", "PUT"]),
  amount: z.number().min(MIN_TRADE_AMOUNT).max(MAX_TRADE_AMOUNT),
  expirationSeconds: z
    .number()
    .int()
    .min(MIN_EXPIRATION_SECONDS)
    .max(MAX_EXPIRATION_SECONDS)
    .refine(
      (v) => v % EXPIRATION_STEP_SECONDS === 0,
      `Must be a multiple of ${EXPIRATION_STEP_SECONDS} seconds`,
    ),
  instrument: z.string().min(1),
  idempotencyKey: z.string().min(1).optional(),
});

export const listTradesQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  status: z.enum(["OPEN", "WIN", "LOSS", "TIE", "CLOSED"]).optional(),
  accountType: z.enum(["DEMO", "REAL"]).optional(),
});

export const balanceHistoryQuerySchema = z.object({
  accountId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const analyticsQuerySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export type OpenTradeBody = z.infer<typeof openTradeBodySchema>;
export type ListTradesQuery = z.infer<typeof listTradesQuerySchema>;
export type BalanceHistoryQuery = z.infer<typeof balanceHistoryQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
