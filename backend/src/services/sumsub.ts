/**
 * Sumsub KYC API client.
 *
 * Request signing: HMAC-SHA256 over (ts + METHOD + path + body).
 * Docs: https://developers.sumsub.com/api-reference/#authentication
 */

import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

const BASE_URL = 'https://api.sumsub.com';
const LEVEL_NAME = 'basic-kyc';

const kycLog = logger.child({ service: 'sumsub' });

// ── Error ────────────────────────────────────────────────────────────

export class SumsubApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: string,
    path: string,
  ) {
    super(`Sumsub API error ${statusCode} at ${path}: ${body}`);
    this.name = 'SumsubApiError';
  }
}

// ── Signing ──────────────────────────────────────────────────────────

function buildHeaders(
  method: string,
  path: string,
  bodyStr: string | null,
): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const data = ts + method.toUpperCase() + path + (bodyStr ?? '');
  const sig = crypto
    .createHmac('sha256', env.SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-App-Token': env.SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': sig,
    'X-App-Access-Ts': ts,
  };
}

// ── HTTP helper ───────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const bodyStr = body !== undefined ? JSON.stringify(body) : null;
  const headers = buildHeaders(method, path, bodyStr);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(bodyStr !== null ? { body: bodyStr } : {}),
  });

  const text = await res.text();

  if (!res.ok) {
    kycLog.error({ status: res.status, body: text, path }, 'Sumsub API request failed');
    throw new SumsubApiError(res.status, text, path);
  }

  return JSON.parse(text) as T;
}

// ── Public API ───────────────────────────────────────────────────────

export interface SumsubApplicant {
  id: string;
  externalUserId: string;
  review?: {
    reviewStatus: string;
    reviewResult?: { reviewAnswer: string };
  };
}

/**
 * Create a new applicant for the given user.
 * Throws SumsubApiError(409) if the applicant already exists — callers should handle this.
 */
export async function createApplicant(externalUserId: string): Promise<SumsubApplicant> {
  const path = `/resources/applicants?levelName=${LEVEL_NAME}`;
  kycLog.info({ externalUserId }, 'Creating Sumsub applicant');
  return request<SumsubApplicant>('POST', path, { externalUserId });
}

/**
 * Issue a short-lived WebSDK access token for the given user.
 * The token expires after ~10 minutes; call this again to refresh.
 */
export async function getAccessToken(externalUserId: string): Promise<{ token: string; userId: string }> {
  const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${LEVEL_NAME}`;
  kycLog.info({ externalUserId }, 'Requesting Sumsub access token');
  return request<{ token: string; userId: string }>('POST', path);
}

/**
 * Fetch the current review status of an applicant.
 */
export async function getApplicantStatus(applicantId: string): Promise<{
  reviewStatus: string;
  reviewResult?: { reviewAnswer: string; rejectLabels?: string[] };
}> {
  const path = `/resources/applicants/${encodeURIComponent(applicantId)}/status`;
  kycLog.info({ applicantId }, 'Fetching Sumsub applicant status');
  return request('GET', path);
}

// ── Webhook helpers ───────────────────────────────────────────────────

/**
 * Verify the X-Payload-Digest signature on an incoming Sumsub webhook.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(rawBody: Buffer, digest: string): boolean {
  const expected = crypto
    .createHmac('sha256', env.WEBHOOK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(digest, 'utf8'),
    );
  } catch {
    return false;
  }
}
