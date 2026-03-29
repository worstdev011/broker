import { getCsrfToken, setCsrfToken, clearCsrfToken, refreshCsrfToken } from './csrf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const REQUEST_TIMEOUT_MS = 15_000;
const REF_COOKIE_NAME = 'ref_code';

function getRefCodeCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${REF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function clearRefCodeCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/2fa', '/api/auth/csrf', '/api/auth/me', '/api/auth/logout'];

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string,
  ) {
    super(message || `API Error: ${status}`);
    this.name = 'ApiError';
  }
}

async function rawFetch<T>(fullUrl: string, options: RequestInit, headers: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const externalSignal = options.signal;
  let isExternalAbort = false;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    externalSignal.addEventListener('abort', () => {
      isExternalAbort = true;
      controller.abort();
    }, { once: true });
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      throw new ApiError(response.status, errorData);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      if (isExternalAbort) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      throw new ApiError(408, { error: 'Request timeout' }, 'Request timeout - server not responding');
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(0, { error: msg }, msg || 'Network error');
  }
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const pathname = url.startsWith('http') ? new URL(url).pathname : url;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (options.method || 'GET').toUpperCase();
  if (MUTATING_METHODS.includes(method) && typeof window !== 'undefined') {
    try {
      headers['x-csrf-token'] = await getCsrfToken();
    } catch {
      // CSRF fetch failed - request may fail with 403
    }
  }

  try {
    return await rawFetch<T>(fullUrl, options, headers);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;

    if (err.status === 403 && MUTATING_METHODS.includes(method) && typeof window !== 'undefined') {
      try {
        headers['x-csrf-token'] = await refreshCsrfToken();
        return await rawFetch<T>(fullUrl, options, headers);
      } catch {
        throw err;
      }
    }

    if (err.status === 401 && typeof window !== 'undefined' && !AUTH_ENDPOINTS.includes(pathname)) {
      clearCsrfToken();
      window.location.href = '/login';
    }

    throw err;
  }
}

export function trackRefClick(): void {
  const refCode = getRefCodeCookie();
  if (!refCode) return;

  // Fire and forget — no await, no error propagation
  fetch(`${API_BASE_URL}/api/partners/track-click`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refCode,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      referer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    }),
  }).catch(() => { /* intentionally silent */ });
}

export const kycApi = {
  init: () =>
    api<{ token: string; applicantId: string | null }>('/api/kyc/init', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};

export const authApi = {
  register: async (email: string, password: string, refCode?: string) => {
    const code = refCode ?? getRefCodeCookie() ?? undefined;
    const res = await api<{ user: { id: string; email: string }; csrfToken?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(code ? { refCode: code } : {}) }),
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    clearRefCodeCookie();
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await api<{ user?: { id: string; email: string }; requires2FA?: boolean; tempToken?: string; csrfToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  },

  verify2FA: async (tempToken: string, code: string) => {
    const res = await api<{ user: { id: string; email: string }; csrfToken?: string }>('/api/auth/2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  },

  logout: async () => {
    const res = await api<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    clearCsrfToken();
    return res;
  },

  me: () =>
    api<{ user: { id: string; email: string; hasPassword?: boolean } }>('/api/auth/me'),
};
