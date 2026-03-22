import { z } from 'zod';
import {
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_MAX_AMOUNT,
  WITHDRAW_MIN_AMOUNT,
  WITHDRAW_MAX_AMOUNT,
} from '../../config/constants.js';

const cardDigits = z
  .string()
  .transform((s) => s.replace(/\s/g, ''))
  .refine((s) => /^\d{16,19}$/.test(s), 'Card number must be 16–19 digits');

export const depositBodySchema = z.object({
  amount: z
    .number()
    .min(DEPOSIT_MIN_AMOUNT, `Amount must be at least ${DEPOSIT_MIN_AMOUNT}`)
    .max(DEPOSIT_MAX_AMOUNT, `Amount must be at most ${DEPOSIT_MAX_AMOUNT}`),
});

export type DepositBodyInput = z.infer<typeof depositBodySchema>;

export const withdrawBodySchema = z.object({
  amount: z
    .number()
    .min(WITHDRAW_MIN_AMOUNT, `Amount must be at least ${WITHDRAW_MIN_AMOUNT}`)
    .max(WITHDRAW_MAX_AMOUNT, `Amount must be at most ${WITHDRAW_MAX_AMOUNT}`),
  cardNumber: cardDigits,
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});

export type WithdrawBodyInput = z.infer<typeof withdrawBodySchema>;
