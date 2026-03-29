import type {
  PartnerPublicDTO,
  PartnerDashboardDTO,
  ReferralsResponse,
  EarningsResponse,
  WithdrawalsResponse,
  PartnerWithdrawalDTO,
} from '@/types/partners';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const CSRF_ENDPOINT = '/api/auth/csrf';
const PARTNER_AUTH_ENDPOINTS = ['/api/partners/login', '/api/partners/register', '/api/partners/logout'];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
    message?: string,
  ) {
    super(message ?? `API Error: ${status}`);
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;

async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${API_BASE}${CSRF_ENDPOINT}`, { credentials: 'include' });
  const json = await res.json() as { csrfToken: string };
  csrfToken = json.csrfToken;
  return csrfToken;
}

async function getCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrf();
}

const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {};

  if (options.body) headers['Content-Type'] = 'application/json';

  if (MUTATING.includes(method) && !PARTNER_AUTH_ENDPOINTS.includes(path)) {
    try {
      headers['x-csrf-token'] = await getCsrf();
    } catch {
      // will fail with 403 — retry handled below
    }
  }

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

  let res = await doFetch();

  // Retry once on CSRF failure
  if (res.status === 403 && MUTATING.includes(method)) {
    try {
      headers['x-csrf-token'] = await fetchCsrf();
      res = await doFetch();
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    let errorData: unknown = null;
    try { errorData = await res.json(); } catch { errorData = { error: res.statusText }; }
    throw new ApiError(res.status, errorData);
  }

  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return res.json() as Promise<T>;
  return {} as T;
}

export const partnersApi = {
  // Auth
  register: async (data: { email: string; password: string; firstName?: string; lastName?: string; telegramHandle?: string }) => {
    const res = await request<{ partner: PartnerPublicDTO }>('/api/partners/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await request<{ partner: PartnerPublicDTO }>('/api/partners/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res;
  },

  logout: async () => {
    csrfToken = null;
    await request<{ success: boolean }>('/api/partners/logout', { method: 'POST', body: JSON.stringify({}) });
  },

  me: () => request<{ partner: PartnerPublicDTO }>('/api/partners/me'),

  // Dashboard
  getDashboard: () => request<PartnerDashboardDTO>('/api/partners/dashboard'),

  // Referrals
  getReferrals: (page = 1, limit = 50) =>
    request<ReferralsResponse>(`/api/partners/referrals?page=${page}&limit=${limit}`),

  // Earnings
  getEarnings: (page = 1, limit = 50) =>
    request<EarningsResponse>(`/api/partners/earnings?page=${page}&limit=${limit}`),

  // Withdrawals
  getWithdrawals: () => request<WithdrawalsResponse>('/api/partners/withdrawals'),

  requestWithdrawal: (amount: number, paymentMethod: string) =>
    request<{ withdrawal: PartnerWithdrawalDTO }>('/api/partners/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod }),
    }),
};
