'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type AuthMode = 'login' | 'register';

interface LandingAuthContextValue {
  open: (mode?: AuthMode) => void;
  close: () => void;
  mode: AuthMode;
  isOpen: boolean;
}

const LandingAuthContext = createContext<LandingAuthContextValue | null>(null);

export function LandingAuthProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('register');

  const open = useCallback((m: AuthMode = 'register') => {
    setMode(m);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <LandingAuthContext.Provider value={{ open, close, mode, isOpen }}>
      {children}
    </LandingAuthContext.Provider>
  );
}

export function useLandingAuth() {
  const ctx = useContext(LandingAuthContext);
  if (!ctx) throw new Error('useLandingAuth must be used inside LandingAuthProvider');
  return ctx;
}
