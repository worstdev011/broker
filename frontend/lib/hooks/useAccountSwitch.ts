'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/api';
import { logger } from '@/lib/logger';
import { toast } from '@/stores/toast.store';

type SwitchableAccount = 'demo' | 'real' | 'DEMO' | 'REAL';

export function useAccountSwitch() {
  const switchAccount = useCallback(async (type: SwitchableAccount): Promise<boolean> => {
    const normalized = type.toLowerCase();
    try {
      const r = await api<{ accounts: Array<{ id: string; type: string }> }>('/api/accounts');
      const a = r.accounts.find((x) => x.type.toLowerCase() === normalized);
      if (!a) return false;
      await api('/api/accounts/switch', {
        method: 'POST',
        body: JSON.stringify({ accountId: a.id }),
      });
      return true;
    } catch (e) {
      logger.error(e);
      toast('Failed to switch account', 'error');
      return false;
    }
  }, []);

  return { switchAccount };
}
