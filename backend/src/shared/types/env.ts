interface Env {
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  ADMIN_URL: string;
  PARTNERS_URL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  SESSION_SECRET: string;
  SESSION_TTL_DAYS: number;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  BETATRANSFER_MERCHANT_ID: string;
  BETATRANSFER_PUBLIC_KEY: string;
  BETATRANSFER_SECRET_KEY: string;
  BETATRANSFER_API_URL: string;
  FRONTEND_DEFAULT_LOCALE: string;
  SUMSUB_APP_TOKEN: string;
  SUMSUB_SECRET_KEY: string;
  SUMSUB_WEBHOOK_SECRET: string;
  ADMIN_EMAILS: string[];
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  PRICE_PROVIDER_URL: string;
  PRICE_PROVIDER_API_KEY: string;
  XCHANGE_API_KEY: string;
}

const REQUIRED_AT_STARTUP = [
  "DATABASE_URL",
  "REDIS_URL",
  "SESSION_SECRET",
] as const;

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

let cached: Env | null = null;

export function validateEnv(): void {
  for (const key of REQUIRED_AT_STARTUP) {
    getEnvOrThrow(key);
  }
}

export function env(): Env {
  if (cached) return cached;

  cached = {
    NODE_ENV: getEnvOrDefault("NODE_ENV", "development"),
    PORT: parseInt(getEnvOrDefault("PORT", "3001"), 10),
    FRONTEND_URL: getEnvOrDefault("FRONTEND_URL", "http://localhost:3000"),
    ADMIN_URL: getEnvOrDefault("ADMIN_URL", "http://localhost:3002"),
    PARTNERS_URL: getEnvOrDefault("PARTNERS_URL", "http://localhost:3003"),
    DATABASE_URL: getEnvOrThrow("DATABASE_URL"),
    REDIS_URL: getEnvOrThrow("REDIS_URL"),
    SESSION_SECRET: getEnvOrThrow("SESSION_SECRET"),
    SESSION_TTL_DAYS: parseInt(getEnvOrDefault("SESSION_TTL_DAYS", "30"), 10),
    GOOGLE_CLIENT_ID: getEnvOrDefault("GOOGLE_CLIENT_ID", ""),
    GOOGLE_CLIENT_SECRET: getEnvOrDefault("GOOGLE_CLIENT_SECRET", ""),
    GOOGLE_CALLBACK_URL: getEnvOrDefault("GOOGLE_CALLBACK_URL", ""),
    BETATRANSFER_MERCHANT_ID: getEnvOrDefault("BETATRANSFER_MERCHANT_ID", ""),
    BETATRANSFER_PUBLIC_KEY: getEnvOrDefault("BETATRANSFER_PUBLIC_KEY", ""),
    BETATRANSFER_SECRET_KEY: getEnvOrDefault("BETATRANSFER_SECRET_KEY", ""),
    BETATRANSFER_API_URL: getEnvOrDefault("BETATRANSFER_API_URL", ""),
    FRONTEND_DEFAULT_LOCALE: getEnvOrDefault("FRONTEND_DEFAULT_LOCALE", "ru"),
    SUMSUB_APP_TOKEN: getEnvOrDefault("SUMSUB_APP_TOKEN", ""),
    SUMSUB_SECRET_KEY: getEnvOrDefault("SUMSUB_SECRET_KEY", ""),
    SUMSUB_WEBHOOK_SECRET: getEnvOrDefault("SUMSUB_WEBHOOK_SECRET", ""),
    ADMIN_EMAILS: getEnvOrDefault("ADMIN_EMAILS", "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    UPLOAD_DIR: getEnvOrDefault("UPLOAD_DIR", "./uploads"),
    MAX_FILE_SIZE: parseInt(
      getEnvOrDefault("MAX_FILE_SIZE", "2097152"),
      10,
    ),
    PRICE_PROVIDER_URL: getEnvOrDefault("PRICE_PROVIDER_URL", ""),
    PRICE_PROVIDER_API_KEY: getEnvOrDefault("PRICE_PROVIDER_API_KEY", ""),
    XCHANGE_API_KEY: getEnvOrDefault("XCHANGE_API_KEY", ""),
  };

  return cached;
}
