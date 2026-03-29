/**
 * useAuth hook - re-exports from AuthProvider context for backward compatibility.
 * New code should import { useAuthContext } from '@/components/providers/AuthProvider'.
 */

'use client';

export { useAuthContext as useAuth } from '@/components/providers/AuthProvider';
