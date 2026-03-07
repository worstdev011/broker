/**
 * Auth Guard - redirects based on auth state
 */

'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from '@/components/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
}

export function AuthGuard({ children, requireAuth, requireGuest }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Public routes that should redirect to /terminal if authenticated
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // If requires auth and not authenticated -> redirect to main (login modal)
    if (requireAuth && !isAuthenticated) {
      router.push('/?auth=login');
      return;
    }

    // If requires guest and authenticated -> redirect to terminal
    if (requireGuest && isAuthenticated) {
      router.push('/terminal');
      return;
    }

    // If on public route and authenticated -> redirect to terminal
    if (isPublicRoute && isAuthenticated) {
      router.push('/terminal');
      return;
    }
  }, [isAuthenticated, isLoading, requireAuth, requireGuest, router, pathname]);

  // Show loader while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#061230]">
        <Image src="/images/logo.png" alt="Comfortrade" width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 object-contain animate-pulse" />
        <span className="text-white/70 text-sm">Загрузка...</span>
      </div>
    );
  }

  // Don't render children if redirecting
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireGuest && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
