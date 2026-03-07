/**
 * Simple API client - all requests with cookies + CSRF for mutating
 */

import { getCsrfToken } from './csrf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const REQUEST_TIMEOUT_MS = 15000; // 15 сек — чтобы не зависать при недоступном бэкенде

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

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
      // CSRF fetch failed — request may fail with 403
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // 🔥 FIX: Поддержка внешнего AbortSignal (например из useHistoryLoader)
  // При abort внешнего signal — пробрасываем abort в наш controller
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
      let errorMessage = `API error ${response.status}`;
      let errorData: unknown = null;
      try {
        errorData = await response.json();
        errorMessage = (errorData as { error?: string; message?: string })?.error ?? (errorData as { error?: string; message?: string })?.message ?? errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      const error = new Error(errorMessage) as Error & { response?: { status: number; statusText: string; data: unknown } };
      error.response = { status: response.status, statusText: response.statusText, data: errorData };
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      // 🔥 FIX: Внешний abort → пробрасываем AbortError как есть (не маскируем под timeout)
      if (isExternalAbort) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      const timeoutErr = new Error('Сервер не отвечает. Проверьте, что бэкенд запущен (npm run dev в папке backend).') as Error & { response?: { status: number; statusText: string; data: unknown } };
      timeoutErr.response = { status: 408, statusText: 'Request Timeout', data: { message: 'Request timeout' } };
      throw timeoutErr;
    }
    throw err;
  }
}
