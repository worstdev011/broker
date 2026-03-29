const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

let cachedToken: string | null = null;
let pendingFetch: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const url = `${API_BASE_URL}/api/auth/csrf`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to get CSRF token');
  }
  const data = (await res.json()) as { csrfToken: string };
  cachedToken = data.csrfToken;
  pendingFetch = null;
  return cachedToken;
}

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (pendingFetch) return pendingFetch;
  pendingFetch = fetchCsrfToken();
  return pendingFetch;
}

export async function refreshCsrfToken(): Promise<string> {
  cachedToken = null;
  pendingFetch = null;
  pendingFetch = fetchCsrfToken();
  return pendingFetch;
}

export function setCsrfToken(token: string): void {
  cachedToken = token;
  pendingFetch = null;
}

export function clearCsrfToken(): void {
  cachedToken = null;
  pendingFetch = null;
}
