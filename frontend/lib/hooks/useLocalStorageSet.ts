import { useState, useCallback } from 'react';

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch { /* quota exceeded or SSR */ }
}

/**
 * Manages a `Set<string>` persisted in localStorage under `key`.
 * Returns `[set, toggle]` where `toggle(id)` adds or removes `id`.
 */
export function useLocalStorageSet(key: string): [Set<string>, (id: string) => void] {
  const [set, setSet] = useState<Set<string>>(() => loadSet(key));

  const toggle = useCallback((id: string) => {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSet(key, next);
      return next;
    });
  }, [key]);

  return [set, toggle];
}
