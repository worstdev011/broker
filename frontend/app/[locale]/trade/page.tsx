'use client';

import { useEffect } from 'react';
import { useRouter } from '@/components/navigation';

export default function TradePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile?tab=trade');
  }, [router]);
  return null;
}
