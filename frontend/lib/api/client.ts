/**
 * API client with cookie-based auth + CSRF
 */

import { logger } from '@/lib/logger';
import { getCsrfToken, setCsrfToken, clearCsrfToken } from './csrf';

// Пустая строка = same-origin (через Next.js rewrites), иначе кросс-домен (cookies не работают)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
};

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

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  // КРИТИЧНО: Никогда не выполняем fetch на сервере
  if (typeof window === 'undefined') {
    throw new ApiError(0, { error: 'API calls are only allowed on client side' }, 'Server-side API calls are not allowed');
  }

  const { method = 'GET', body, headers = {} } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (MUTATING_METHODS.includes(method) && typeof window !== 'undefined') {
    // Logout не требует CSRF (в skip paths на бэке)
    if (endpoint !== '/api/auth/logout') {
      try {
        requestHeaders['csrf-token'] = await getCsrfToken();
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('[API] CSRF token fetch failed:', e);
        }
      }
    }
  }

  // Debug logging in development (только на клиенте)
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[API] ${method} ${url}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include', // Include cookies
    signal: controller.signal,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      if (process.env.NODE_ENV === 'development' && response.status === 400) {
        logger.warn('[API] 400 Bad Request:', errorData);
      }
      throw new ApiError(response.status, errorData);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return {} as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    if (err.name === 'AbortError') {
      throw new ApiError(408, { error: 'Request timeout' }, 'Request timeout - server not responding');
    }

    throw new ApiError(0, { error: err.message || 'Network error' }, err.message || 'Network error');
  }
}

// KYC endpoints
export const kycApi = {
  /**
   * Create (or reuse) a Sumsub applicant and get a fresh WebSDK access token.
   */
  init: (userId: string) =>
    apiRequest<{ token: string; applicantId: string | null }>('/api/kyc/init', {
      method: 'POST',
      body: { userId },
    }),
};

// Auth endpoints
export const authApi = {
  register: async (email: string, password: string) => {
    const res = await apiRequest<{ user: { id: string; email: string }; csrfToken?: string }>('/api/auth/register', {
      method: 'POST',
      body: { email, password },
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await apiRequest<{ user?: { id: string; email: string }; requires2FA?: boolean; tempToken?: string; csrfToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  },

  verify2FA: async (tempToken: string, code: string) => {
    const res = await apiRequest<{ user: { id: string; email: string }; csrfToken?: string }>('/api/auth/2fa', {
      method: 'POST',
      body: { tempToken, code },
    });
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  },

  logout: async () => {
    const res = await apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: {},
    });
    clearCsrfToken();
    return res;
  },

  me: () =>
    apiRequest<{ user: { id: string; email: string } }>('/api/auth/me'),
};
