/**
 * Unit tests: Validation schemas (Zod)
 */

import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordStrongSchema,
  passwordSchema,
  nicknameSchema,
  firstNameSchema,
  lastNameSchema,
  avatarUrlSchema,
} from '../../src/shared/validation/schemas.js';
import { updateProfileSchema } from '../../src/modules/user/user.validation.js';

describe('emailSchema', () => {
  it('should accept valid email', () => {
    expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
    expect(emailSchema.parse('User@Example.COM')).toBe('user@example.com');
  });

  it('should reject empty', () => {
    expect(() => emailSchema.parse('')).toThrow();
  });

  it('should reject invalid format', () => {
    expect(() => emailSchema.parse('invalid')).toThrow();
    expect(() => emailSchema.parse('@example.com')).toThrow();
    expect(() => emailSchema.parse('user@')).toThrow();
  });

  it('should reject too long', () => {
    const long = 'a'.repeat(250) + '@example.com';
    expect(() => emailSchema.parse(long)).toThrow();
  });
});

describe('passwordStrongSchema', () => {
  it('should accept passwords with min length 6 (no digit required)', () => {
    expect(passwordStrongSchema.parse('Password123')).toBeDefined();
    expect(passwordStrongSchema.parse('abcdef')).toBeDefined();
    expect(passwordStrongSchema.parse('password123')).toBeDefined();
    expect(passwordStrongSchema.parse('PASSWORD')).toBeDefined();
  });

  it('should reject too short', () => {
    expect(() => passwordStrongSchema.parse('Pass1')).toThrow();
    expect(() => passwordStrongSchema.parse('abcde')).toThrow();
  });

  it('should reject too long (>128)', () => {
    const long = 'a'.repeat(129);
    expect(() => passwordStrongSchema.parse(long)).toThrow();
  });
});

describe('passwordSchema', () => {
  it('should accept any non-empty password', () => {
    expect(passwordSchema.parse('x')).toBeDefined();
    expect(passwordSchema.parse('password')).toBeDefined();
  });

  it('should reject empty', () => {
    expect(() => passwordSchema.parse('')).toThrow();
  });

  it('should reject too long (>128)', () => {
    expect(() => passwordSchema.parse('a'.repeat(129))).toThrow();
  });
});

describe('nicknameSchema', () => {
  it('should accept valid nickname', () => {
    expect(nicknameSchema.parse('john_doe')).toBe('john_doe');
    expect(nicknameSchema.parse('@trader')).toBe('@trader');
    expect(nicknameSchema.parse('abc')).toBe('abc');
  });

  it('should reject too short', () => {
    expect(() => nicknameSchema.parse('ab')).toThrow();
  });

  it('should reject invalid chars', () => {
    expect(() => nicknameSchema.parse('john-doe')).toThrow();
    expect(() => nicknameSchema.parse('john doe')).toThrow();
  });
});

describe('firstNameSchema', () => {
  it('should accept valid name', () => {
    expect(firstNameSchema.parse('John')).toBe('John');
    expect(firstNameSchema.parse("O'Brien")).toBe("O'Brien");
  });

  it('should reject empty', () => {
    expect(() => firstNameSchema.parse('')).toThrow();
  });

  it('should reject invalid chars', () => {
    expect(() => firstNameSchema.parse('John@123')).toThrow();
    expect(() => firstNameSchema.parse('John<script>')).toThrow();
  });
});

describe('lastNameSchema', () => {
  it('should accept valid name', () => {
    expect(lastNameSchema.parse('Doe')).toBe('Doe');
  });

  it('should reject empty', () => {
    expect(() => lastNameSchema.parse('')).toThrow();
  });
});

describe('avatarUrlSchema', () => {
  it('should accept valid upload path', () => {
    expect(avatarUrlSchema.parse('/uploads/avatars/abc123.jpg')).toBeDefined();
    expect(avatarUrlSchema.parse('/uploads/avatars/xyz.png')).toBeDefined();
  });

  it('should reject external URL', () => {
    expect(() => avatarUrlSchema.parse('https://evil.com/xss.jpg')).toThrow();
  });

  it('should reject path traversal', () => {
    expect(() => avatarUrlSchema.parse('/uploads/avatars/../../../etc/passwd')).toThrow();
  });
});

describe('updateProfileSchema (country sanitization)', () => {
  it('should strip HTML tags from country (XSS protection)', () => {
    const result = updateProfileSchema.parse({ country: 'Ukraine <script>alert(1)</script>' });
    // Tags removed; script content becomes harmless text
    expect(result.country).toBe('Ukraine alert(1)');
    expect(result.country).not.toContain('<');
    expect(result.country).not.toContain('>');
  });

  it('should accept valid country', () => {
    const result = updateProfileSchema.parse({ country: 'Ukraine' });
    expect(result.country).toBe('Ukraine');
  });

  it('should accept null to clear country', () => {
    const result = updateProfileSchema.parse({ country: null });
    expect(result.country).toBeNull();
  });
});
