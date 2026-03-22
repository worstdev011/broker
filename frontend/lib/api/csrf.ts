

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const url = `${API_BASE_URL}/api/auth/csrf`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to get CSRF token');
  }
  const data = (await res.json()) as { csrfToken: string };
  cachedToken = data.csrfToken;
  return cachedToken;
}

/** Store token from login/register response (avoids extra fetch) */
export function setCsrfToken(token: string): void {
  cachedToken = token;
}

/** Clear cached token on logout */
export function clearCsrfToken(): void {
  cachedToken = null;
}
