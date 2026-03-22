/**
 * useAuth hook - manages authentication state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi, ApiError } from '../api/client';
import { parseValidationError } from '../api/validationError';
import { VERIFICATION_STORAGE_KEY } from './useVerification';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.data) {
      return parseValidationError(error.data);
    }
    if (typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
      const msg = (error.data as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

interface User {
  id: string;
  email: string;
  hasPassword?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    // Только на клиенте - никогда не выполняем на сервере
    if (typeof window === 'undefined') {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      const response = await authApi.me();
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      // Игнорируем ошибки - просто считаем что не авторизован
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      
      // 🔥 FLOW S3: Check if 2FA is required
      if (response.requires2FA && response.tempToken) {
        return {
          success: false,
          requires2FA: true,
          tempToken: response.tempToken,
        };
      }

      if (response.user) {
        setState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
        });
        return { success: true };
      }

      return { success: false, error: 'Unexpected response format' };
    } catch (error: unknown) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 401) return { success: false, error: 'Неверный email или пароль' };
      return { success: false, error: getErrorMessage(error, 'Ошибка входа') };
    }
  }, []);

  // 🔥 FLOW S3: Verify 2FA code and complete login
  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    try {
      const response = await authApi.verify2FA(tempToken, code);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, '2FA verification failed') };
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.register(email, password);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true };
    } catch (error: unknown) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 409) return { success: false, error: 'Пользователь с этим email уже зарегистрирован. Войдите в систему.' };
      return { success: false, error: getErrorMessage(error, 'Ошибка регистрации') };
    }
  }, []);

  const logout = useCallback(async () => {
    const clearClient = () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(VERIFICATION_STORAGE_KEY);
      }
    };

    try {
      await authApi.logout();
      clearClient();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      clearClient();
      // Even if logout fails, clear local state
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Check auth on mount - только на клиенте
  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, [checkAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    verify2FA,
    checkAuth,
  };
}
