/**
 * Shared validation schemas - reusable Zod schemas for input sanitization
 * Prevents XSS, injection, and enforces security rules
 */

import { z } from 'zod';

/** RFC 5322 compliant email regex (simplified) */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Nickname: alphanumeric + underscore only, 3-30 chars (optional @ prefix) */
const NICKNAME_REGEX = /^@?[a-zA-Z0-9_]{3,30}$/;

/** Sanitize: trim and limit length, remove control chars */
function sanitizeString(str: string, maxLen: number): string {
  return str
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .slice(0, maxLen);
}

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .regex(EMAIL_REGEX, 'Invalid email format')
  .transform((s) => s.toLowerCase().trim());

export const passwordStrongSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be at most 128 characters');

export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password must be at most 128 characters');

export const nicknameSchema = z
  .string()
  .regex(NICKNAME_REGEX, 'Nickname must be 3-30 alphanumeric characters or underscores (optional @ prefix)')
  .transform((s) => s.trim());

/** First/last name: letters, spaces, hyphens, apostrophes only */
const NAME_REGEX = /^[\p{L}\p{N}\s\-']+$/u;

export const firstNameSchema = z
  .string()
  .min(1, 'First name cannot be empty')
  .max(50, 'First name must be at most 50 characters')
  .regex(NAME_REGEX, 'First name contains invalid characters')
  .transform((s) => sanitizeString(s, 50));

export const lastNameSchema = z
  .string()
  .min(1, 'Last name cannot be empty')
  .max(50, 'Last name must be at most 50 characters')
  .regex(NAME_REGEX, 'Last name contains invalid characters')
  .transform((s) => sanitizeString(s, 50));

/** Local avatar path pattern (server-generated after upload) */
const LOCAL_AVATAR_PATTERN = /^\/uploads\/avatars\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i;

export const avatarUrlSchema = z
  .string()
  .refine(
    (url) => {
      // Only allow relative paths from our uploads (XSS protection)
      return LOCAL_AVATAR_PATTERN.test(url);
    },
    { message: 'Avatar URL must be a valid upload path (/uploads/avatars/...) or null' }
  )
  .optional()
  .nullable();
