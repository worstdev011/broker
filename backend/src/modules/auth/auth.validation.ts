import { z } from 'zod';
import { emailSchema, passwordStrongSchema, passwordSchema } from '../../shared/validation/schemas.js';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordStrongSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required').trim(),
  code: z.string().length(6, '2FA code must be 6 digits').regex(/^\d{6}$/, '2FA code must contain only digits'),
});

export type Verify2FAInput = z.infer<typeof verify2FASchema>;
