/**
 * Environment configuration and validation.
 * Fails fast at startup if required variables are missing.
 */

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  COOKIE_SECRET: string;
  FRONTEND_URL: string;
  XCHANGE_API_KEY: string;
  MAX_UPLOAD_SIZE: number;
  DATABASE_POOL_SIZE: number;
  DATABASE_POOL_TIMEOUT: number;
  DATABASE_CONNECT_TIMEOUT: number;
  REDIS_URL: string | null;
  ADMIN_EMAILS: string[];
  SUMSUB_APP_TOKEN: string;
  SUMSUB_SECRET_KEY: string;
  WEBHOOK_SECRET_KEY: string;
}

const DEFAULT_MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const DEFAULT_DATABASE_POOL_SIZE = 10;
const DEFAULT_DATABASE_POOL_TIMEOUT = 20;
const DEFAULT_DATABASE_CONNECT_TIMEOUT = 10;
const DEV_COOKIE_SECRET = 'dev-secret-not-for-production';
const DEV_FRONTEND_URL = 'http://localhost:3000';

function parseIntEnv(name: string, defaultValue: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;

  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    console.warn(
      `[env] Invalid ${name}="${raw}" (must be ${min}–${max}), using default ${defaultValue}`,
    );
    return defaultValue;
  }
  return parsed;
}

function buildDatabaseUrl(baseUrl: string, poolSize: number, poolTimeout: number, connectTimeout: number): string {
  const params: string[] = [];
  if (!baseUrl.includes('connection_limit')) {
    params.push(`connection_limit=${poolSize}`);
  }
  if (!baseUrl.includes('pool_timeout')) {
    params.push(`pool_timeout=${poolTimeout}`);
  }
  if (!baseUrl.includes('connect_timeout')) {
    params.push(`connect_timeout=${connectTimeout}`);
  }
  if (params.length === 0) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.join('&')}`;
}

function validateEnv(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as string;
  const isProduction = nodeEnv === 'production';

  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV="${nodeEnv}". Must be: development, production, test.`);
  }

  const missing: string[] = [];

  if (!process.env.PORT) missing.push('PORT');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');

  if (isProduction) {
    if (!process.env.COOKIE_SECRET?.trim()) missing.push('COOKIE_SECRET');
    if (!process.env.FRONTEND_URL?.trim()) missing.push('FRONTEND_URL');
    if (!process.env.XCHANGE_API_KEY?.trim()) missing.push('XCHANGE_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
        'In production COOKIE_SECRET, FRONTEND_URL, and XCHANGE_API_KEY are also required.',
    );
  }

  const port = parseInt(process.env.PORT!, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT="${process.env.PORT}". Must be 1–65535.`);
  }

  const maxUploadSize = parseIntEnv('MAX_UPLOAD_SIZE', DEFAULT_MAX_UPLOAD_SIZE, 1, 50 * 1024 * 1024);
  const databasePoolSize = parseIntEnv('DATABASE_POOL_SIZE', DEFAULT_DATABASE_POOL_SIZE, 1, 100);
  const databasePoolTimeout = parseIntEnv('DATABASE_POOL_TIMEOUT', DEFAULT_DATABASE_POOL_TIMEOUT, 1, 120);
  const databaseConnectTimeout = parseIntEnv('DATABASE_CONNECT_TIMEOUT', DEFAULT_DATABASE_CONNECT_TIMEOUT, 1, 60);

  const databaseUrl = buildDatabaseUrl(
    process.env.DATABASE_URL!,
    databasePoolSize,
    databasePoolTimeout,
    databaseConnectTimeout,
  );

  const redisUrl = process.env.REDIS_URL?.trim() || null;

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const sumsubAppToken = process.env.SUMSUB_APP_TOKEN?.trim() ?? '';
  const sumsubSecretKey = process.env.SUMSUB_SECRET_KEY?.trim() ?? '';
  const webhookSecretKey = process.env.WEBHOOK_SECRET_KEY?.trim() ?? '';

  if (!sumsubAppToken || !sumsubSecretKey || !webhookSecretKey) {
    console.warn(
      '[env] Sumsub KYC vars (SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY, WEBHOOK_SECRET_KEY) are not set — KYC endpoints will fail at runtime.',
    );
  }

  return {
    PORT: port,
    DATABASE_URL: databaseUrl,
    NODE_ENV: nodeEnv as EnvConfig['NODE_ENV'],
    COOKIE_SECRET: isProduction
      ? process.env.COOKIE_SECRET!.trim()
      : (process.env.COOKIE_SECRET?.trim() || DEV_COOKIE_SECRET),
    FRONTEND_URL: isProduction
      ? process.env.FRONTEND_URL!.trim()
      : (process.env.FRONTEND_URL?.trim() || DEV_FRONTEND_URL),
    XCHANGE_API_KEY: isProduction
      ? process.env.XCHANGE_API_KEY!.trim()
      : (process.env.XCHANGE_API_KEY?.trim() || ''),
    MAX_UPLOAD_SIZE: maxUploadSize,
    DATABASE_POOL_SIZE: databasePoolSize,
    DATABASE_POOL_TIMEOUT: databasePoolTimeout,
    DATABASE_CONNECT_TIMEOUT: databaseConnectTimeout,
    REDIS_URL: redisUrl,
    ADMIN_EMAILS: adminEmails,
    SUMSUB_APP_TOKEN: sumsubAppToken,
    SUMSUB_SECRET_KEY: sumsubSecretKey,
    WEBHOOK_SECRET_KEY: webhookSecretKey,
  };
}

export const env = validateEnv();
