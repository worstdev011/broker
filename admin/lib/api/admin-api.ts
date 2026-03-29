const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── CSRF token cache ─────────────────────────────────────────────────────────

let _csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/csrf`, {
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch CSRF token");
  const data = (await res.json()) as { csrfToken: string };
  _csrfToken = data.csrfToken;
  return _csrfToken;
}

async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken;
  return fetchCsrfToken();
}

export function clearCsrfToken(): void {
  _csrfToken = null;
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

const MUTATING_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (MUTATING_METHODS.has(method)) {
    const token = await getCsrfToken();
    headers["x-csrf-token"] = token;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    // Clear cached CSRF token on auth errors
    _csrfToken = null;
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(res.status, "Unauthorized");
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { message?: string };
      if (errBody.message) message = errBody.message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Public API wrapper ───────────────────────────────────────────────────────

export const adminApi = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },

  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },
};
