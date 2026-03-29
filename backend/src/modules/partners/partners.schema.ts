import { z } from "zod";

export const registerPartnerBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  telegramHandle: z.string().optional(),
});

export const loginPartnerBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const trackClickBodySchema = z.object({
  refCode: z.string().min(1).max(20),
  userAgent: z.string().optional(),
  referer: z.string().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const withdrawalBodySchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().min(1).max(500),
});

export type RegisterPartnerBody = z.infer<typeof registerPartnerBodySchema>;
export type LoginPartnerBody = z.infer<typeof loginPartnerBodySchema>;
export type TrackClickBody = z.infer<typeof trackClickBodySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type WithdrawalBody = z.infer<typeof withdrawalBodySchema>;
