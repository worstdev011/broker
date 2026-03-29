'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { authApi, ApiError } from '@/lib/api/api';
import { parseValidationError, type ValidationMessageStrings } from '@/lib/api/validationError';
import { VERIFICATION_STORAGE_KEY } from '@/lib/hooks/useVerification';
import { useAccountStore } from '@/stores/account.store';

interface User {
  id: string;
  email: string;
  hasPassword?: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean; tempToken?: string }>;
  register: (email: string, password: string, refCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verify2FA: (tempToken: string, code: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const tAuth = useTranslations('auth');
  const tErr = useTranslations('errors');

  const validationStrings = useMemo((): ValidationMessageStrings => ({
    generic: tErr('validation_generic'),
    fieldPassword: tErr('validation_field_password'),
    fieldEmail: tErr('validation_field_email'),
    fieldFallback: tErr('validation_field_fallback'),
    passwordMin6: tErr('validation_password_min6'),
  }), [tErr]);

  const getErrorMessage = useCallback((error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
      if (error.status === 400 && error.data) {
        return parseValidationError(error.data, validationStrings);
      }
      if (typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
        const msg = (error.data as { message: unknown }).message;
        if (typeof msg === 'string') return msg;
      }
      return error.message || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  }, [validationStrings]);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const response = await authApi.me();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      if (response.requires2FA && response.tempToken) {
        return { success: false, requires2FA: true, tempToken: response.tempToken };
      }
      if (response.user) {
        setUser(response.user);
        return { success: true };
      }
      return { success: false, error: tAuth('unexpected_response') };
    } catch (error: unknown) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 401) return { success: false, error: tAuth('invalid_credentials') };
      return { success: false, error: getErrorMessage(error, tAuth('login_error')) };
    }
  }, [getErrorMessage, tAuth]);

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    try {
      const response = await authApi.verify2FA(tempToken, code);
      setUser(response.user);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, tAuth('twofa_verify_failed')) };
    }
  }, [getErrorMessage, tAuth]);

  const register = useCallback(async (email: string, password: string, refCode?: string) => {
    try {
      const response = await authApi.register(email, password, refCode);
      setUser(response.user);
      return { success: true };
    } catch (error: unknown) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 409) return { success: false, error: tAuth('email_already_registered_full') };
      return { success: false, error: getErrorMessage(error, tAuth('register_error')) };
    }
  }, [getErrorMessage, tAuth]);

  const logout = useCallback(async () => {
    const clearClient = () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(VERIFICATION_STORAGE_KEY);
      }
      useAccountStore.getState().clear();
    };
    try {
      await authApi.logout();
    } catch {
      // Even if API call fails, still clear state
    }
    clearClient();
    setUser(null);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, [checkAuth]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    verify2FA,
    checkAuth,
  }), [user, isLoading, isAuthenticated, login, register, logout, verify2FA, checkAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
