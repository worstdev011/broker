'use client';

import { useEffect } from 'react';
import { useRouter } from '@/components/navigation';

export default function WalletPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile?tab=wallet');
  }, [router]);
  return null;
}
