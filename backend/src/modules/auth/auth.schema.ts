import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
  refCode: z.string().max(20).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const twoFactorBodySchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type TwoFactorBody = z.infer<typeof twoFactorBodySchema>;
