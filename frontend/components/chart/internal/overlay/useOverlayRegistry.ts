/**
 * FLOW O3 - Overlay Registry (Data Layer)
 * ref-based, no React state для списка оверлеев.
 * API: addOverlay, removeOverlay, toggleVisibility, getVisibleOverlays, getOverlays.
 * onMutate вызывается после любой мутации - родитель может форсить ре-рендер панели.
 */

import { useRef, useCallback, useMemo } from 'react';
import type { Overlay, IndicatorOverlay, DrawingOverlay } from './overlay.types';

export interface OverlayRegistryApi {
  addOverlay: (overlay: Overlay) => void;
  removeOverlay: (id: string) => void;
  toggleVisibility: (id: string) => void;
  getOverlays: () => Overlay[];
  getVisibleOverlays: () => Overlay[];
  getVisibleOverlayIds: () => Set<string>;
}

export interface UseOverlayRegistryParams {
  onMutate?: () => void;
}

export function useOverlayRegistry(params: UseOverlayRegistryParams = {}): OverlayRegistryApi {
  const { onMutate } = params;
  const overlaysRef = useRef<Overlay[]>([]);

  const notify = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

  const addOverlay = useCallback(
    (overlay: Overlay) => {
      const prev = overlaysRef.current;
      const exists = prev.some((o) => o.id === overlay.id);
      if (exists) {
        overlaysRef.current = prev.map((o) => (o.id === overlay.id ? overlay : o));
      } else {
        overlaysRef.current = [...prev, overlay];
      }
      notify();
    },
    [notify]
  );

  const removeOverlay = useCallback(
    (id: string) => {
      overlaysRef.current = overlaysRef.current.filter((o) => o.id !== id);
      notify();
    },
    [notify]
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      overlaysRef.current = overlaysRef.current.map((o) =>
        o.id === id ? { ...o, visible: !o.visible } : o
      );
      notify();
    },
    [notify]
  );

  const getOverlays = useCallback((): Overlay[] => {
    return [...overlaysRef.current];
  }, []);

  const getVisibleOverlays = useCallback((): Overlay[] => {
    return overlaysRef.current.filter((o) => o.visible);
  }, []);

  const getVisibleOverlayIds = useCallback((): Set<string> => {
    return new Set(overlaysRef.current.filter((o) => o.visible).map((o) => o.id));
  }, []);

  return useMemo(
    () => ({
      addOverlay,
      removeOverlay,
      toggleVisibility,
      getOverlays,
      getVisibleOverlays,
      getVisibleOverlayIds,
    }),
    [addOverlay, removeOverlay, toggleVisibility, getOverlays, getVisibleOverlays, getVisibleOverlayIds]
  );
}
