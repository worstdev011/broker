/**
 * Unit tests: Crypto utilities
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateSessionToken,
} from '../../src/utils/crypto.js';

describe('hashPassword', () => {
  it('should return different hash for same password', async () => {
    const hash1 = await hashPassword('password123');
    const hash2 = await hashPassword('password123');
    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatch(/^\$2[aby]\$/); // bcrypt format
  });
});

describe('verifyPassword', () => {
  it('should return true for correct password', async () => {
    const hash = await hashPassword('MySecret123');
    const result = await verifyPassword('MySecret123', hash);
    expect(result).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('MySecret123');
    const result = await verifyPassword('WrongPassword', hash);
    expect(result).toBe(false);
  });

  it('should return false when hash is null or empty', async () => {
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', undefined)).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });
});

describe('hashToken', () => {
  it('should return consistent SHA-256 hash', () => {
    const token = 'abc123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[a-f0-9]+$/);
  });

  it('should return different hash for different tokens', () => {
    expect(hashToken('token1')).not.toBe(hashToken('token2'));
  });
});

describe('generateSessionToken', () => {
  it('should return 64 hex chars', () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('should return unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSessionToken());
    }
    expect(tokens.size).toBe(100);
  });
});
