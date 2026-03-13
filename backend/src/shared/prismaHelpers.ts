import type { Prisma } from '@prisma/client';

/**
 * Convert Prisma Decimal (or already-number) to a plain JS number.
 * Avoids the repeated `typeof x === 'number' ? x : Number(x)` pattern
 * across every Prisma repository mapper.
 */
export function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}
