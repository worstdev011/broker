/**
 * Cryptographic utilities
 */

import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (hash == null || hash === '') return false;
  return bcrypt.compare(password, hash);
}

/**
 * Hash session token using SHA-256
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex'); // 64 hex chars
}

