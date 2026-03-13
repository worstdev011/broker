import { useEffect, type RefObject } from 'react';

/**
 * Calls `onClose` when a mousedown/touchstart event occurs outside `ref`.
 * Only attaches listeners while `active` is true.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (target && ref.current && !ref.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);

    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [ref, onClose, active]);
}
