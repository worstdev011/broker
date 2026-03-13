import { randomBytes } from 'crypto';

interface TempTokenData {
  userId: string;
  expiresAt: number;
}

const MAX_TOKENS = 10_000;
const TOKEN_TTL_MS = 5 * 60 * 1_000; // 5 minutes

const tempTokens = new Map<string, TempTokenData>();

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tempTokens.entries()) {
    if (data.expiresAt < now) {
      tempTokens.delete(token);
    }
  }
}, 60_000);

export function generateTempToken(userId: string): string {
  if (tempTokens.size >= MAX_TOKENS) {
    const oldest = tempTokens.keys().next().value;
    if (oldest) tempTokens.delete(oldest);
  }

  const token = randomBytes(32).toString('hex');

  tempTokens.set(token, {
    userId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
}

export function verifyTempToken(token: string): string | null {
  const data = tempTokens.get(token);
  if (!data) return null;

  if (data.expiresAt < Date.now()) {
    tempTokens.delete(token);
    return null;
  }

  tempTokens.delete(token);
  return data.userId;
}
