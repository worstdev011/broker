import { renderHook, act, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useAuth } from '../useAuth';
import { AuthProvider } from '@/components/providers/AuthProvider';
import enMessages from '../../../messages/en.json';

jest.mock('@/lib/api/api', () => ({
  authApi: {
    me: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    verify2FA: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    data: unknown;
    constructor(status: number, data: unknown, message?: string) {
      super(message || `API Error: ${status}`);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
}));

const { authApi, ApiError } = jest.requireMock('@/lib/api/api') as {
  authApi: Record<string, jest.Mock>;
  ApiError: typeof import('@/lib/api/api').ApiError;
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AuthProvider>{children}</AuthProvider>
    </NextIntlClientProvider>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with loading true', () => {
    (authApi.me as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('sets user on successful me()', async () => {
    const user = { id: '1', email: 'test@test.com' };
    (authApi.me as jest.Mock).mockResolvedValue({ user });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('sets unauthenticated on me() error', async () => {
    (authApi.me as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login success updates state', async () => {
    (authApi.me as jest.Mock).mockResolvedValue({ user: null });
    const user = { id: '1', email: 'a@b.com' };
    (authApi.login as jest.Mock).mockResolvedValue({ user });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: { success?: boolean; error?: string } = {};
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'pass');
    });
    expect(loginResult).toEqual({ success: true });
    expect(result.current.user).toEqual(user);
  });

  it('login returns 401 error message', async () => {
    (authApi.me as jest.Mock).mockResolvedValue({ user: null });
    (authApi.login as jest.Mock).mockRejectedValue(new ApiError(401, {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: { success?: boolean; error?: string } = {};
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'wrong');
    });
    expect(loginResult).toEqual({ success: false, error: 'Invalid email or password' });
  });

  it('register returns 409 for duplicate', async () => {
    (authApi.me as jest.Mock).mockResolvedValue({ user: null });
    (authApi.register as jest.Mock).mockRejectedValue(new ApiError(409, {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let regResult: { success?: boolean; error?: string } = {};
    await act(async () => {
      regResult = await result.current.register('a@b.com', 'pass');
    });
    expect(regResult.error).toContain('already registered');
  });

  it('logout clears user', async () => {
    (authApi.me as jest.Mock).mockResolvedValue({ user: { id: '1', email: 'a@b.com' } });
    (authApi.logout as jest.Mock).mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
