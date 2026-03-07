/**
 * User validation schemas using Zod
 * Provides type-safe validation and input sanitization (XSS protection)
 */

import { z } from 'zod';
import {
  nicknameSchema,
  firstNameSchema,
  lastNameSchema,
  avatarUrlSchema,
  passwordStrongSchema,
  passwordSchema,
} from '../../shared/validation/schemas.js';
import { sanitizeHtml } from '../../shared/validation/sanitize.js';

/** Optional name - valid name or empty/whitespace (clears to null) */
const optionalNameSchema = z
  .union([
    firstNameSchema,
    z.string().refine((s) => !s.trim(), 'Empty or valid name').transform(() => null),
  ])
  .optional()
  .nullable();

const optionalLastNameSchema = z
  .union([
    lastNameSchema,
    z.string().refine((s) => !s.trim(), 'Empty or valid name').transform(() => null),
  ])
  .optional()
  .nullable();

const optionalNicknameSchema = z
  .union([
    nicknameSchema,
    z.string().refine((s) => !s.trim(), 'Empty or valid nickname').transform(() => null),
  ])
  .optional()
  .nullable();

/**
 * Schema for updating user profile
 * All user-generated content is sanitized
 */
export const updateProfileSchema = z.object({
  firstName: optionalNameSchema,
  lastName: optionalLastNameSchema,
  nickname: optionalNicknameSchema,
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +380991234567)')
    .optional()
    .nullable(),
  country: z
    .union([
      z.string().max(100, 'Country name must be at most 100 characters').transform((s) => sanitizeHtml(s).slice(0, 100) || null),
      z.null(),
    ])
    .optional(),
  currency: z
    .string()
    .min(3, 'Currency code must be at least 3 characters')
    .max(10, 'Currency code must be at most 10 characters')
    .transform((s) => s.toUpperCase().trim())
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const d = new Date(date);
        return !isNaN(d.getTime());
      },
      { message: 'Invalid date' }
    )
    .optional()
    .nullable(),
  avatarUrl: avatarUrlSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordStrongSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Schema for deleting profile (requires password confirmation)
 */
export const deleteProfileSchema = z.object({
  password: passwordSchema,
});

export type DeleteProfileInput = z.infer<typeof deleteProfileSchema>;

/**
 * Schema for enabling 2FA (no body required)
 */
export const enable2FASchema = z.object({});

export type Enable2FAInput = z.infer<typeof enable2FASchema>;

/**
 * Schema for verifying 2FA during setup
 */
export const verify2FASetupSchema = z.object({
  code: z.string().length(6, '2FA code must be 6 digits').regex(/^\d{6}$/, '2FA code must contain only digits'),
});

export type Verify2FASetupInput = z.infer<typeof verify2FASetupSchema>;

/**
 * Schema for disabling 2FA
 */
export const disable2FASchema = z.object({
  password: passwordSchema,
  code: z.string().length(6, '2FA code must be 6 digits').regex(/^\d{6}$/, '2FA code must contain only digits'),
});

export type Disable2FAInput = z.infer<typeof disable2FASchema>;
