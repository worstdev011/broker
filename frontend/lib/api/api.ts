import { getCsrfToken, setCsrfToken, clearCsrfToken } from './csrf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const REQUEST_TIMEOUT_MS = 15_000;

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

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

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (options.method || 'GET').toUpperCase();
  if (MUTATING_METHODS.includes(method) && typeof window !== 'undefined') {
    try {
      headers['csrf-token'] = await getCsrfToken();
    } catch {
      // CSRF fetch failed - request may fail with 403
    }
  }

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

export const kycApi = {
  init: (userId: string) =>
    api<{ token: string; applicantId: string | null }>('/api/kyc/init', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
};

export const authApi = {
  register: async (email: string, password: string) => {
    const res = await api<{ user: { id: string; email: string }; csrfToken?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
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
