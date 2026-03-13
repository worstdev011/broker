import { randomInt } from 'crypto';

const MIN = 10_000_000;
const MAX = 99_999_999;

export function generateUserId(): string {
  return String(randomInt(MIN, MAX + 1));
}
