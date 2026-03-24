/**
 * Auth Guard - redirects based on auth state
 */

'use client';

import { useEffect } from 'react';
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
      <div className="min-h-screen flex items-center justify-center bg-[#061230]">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#3347ff] animate-spin" />
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
