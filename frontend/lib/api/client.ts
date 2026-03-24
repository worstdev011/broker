/**
 * Re-exports from the unified API client for backward compatibility.
 * New code should import directly from '@/lib/api/api'.
 */
export { api as apiRequest, ApiError, authApi, kycApi } from './api';
