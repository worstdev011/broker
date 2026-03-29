import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../shared/types/env.js";
import { logger } from "../shared/logger.js";

const BASE_URL = "https://api.sumsub.com";
const LEVEL_NAME = "basic-kyc";

export class SumsubApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: string,
    path: string,
  ) {
    super(`Sumsub API error ${statusCode} at ${path}: ${body}`);
    this.name = "SumsubApiError";
  }
}

function buildHeaders(
  method: string,
  path: string,
  bodyStr: string | null,
): Record<string, string> {
  const config = env();
  const ts = Math.floor(Date.now() / 1000).toString();
  const data = ts + method.toUpperCase() + path + (bodyStr ?? "");
  const sig = createHmac("sha256", config.SUMSUB_SECRET_KEY)
    .update(data)
    .digest("hex");

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-App-Token": config.SUMSUB_APP_TOKEN,
    "X-App-Access-Sig": sig,
    "X-App-Access-Ts": ts,
  };
}

async function sumsubRequest<T>(
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
    logger.error({ status: res.status, body: text, path }, "Sumsub API request failed");
    throw new SumsubApiError(res.status, text, path);
  }

  return JSON.parse(text) as T;
}

export const sumsubService = {
  async createApplicant(externalUserId: string): Promise<{ id: string }> {
    const path = `/resources/applicants?levelName=${LEVEL_NAME}`;
    logger.info({ externalUserId }, "Creating Sumsub applicant");
    return sumsubRequest<{ id: string }>("POST", path, { externalUserId });
  },

  async getAccessToken(externalUserId: string): Promise<{ token: string }> {
    const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${LEVEL_NAME}`;
    logger.info({ externalUserId }, "Requesting Sumsub access token");
    return sumsubRequest<{ token: string }>("POST", path);
  },

  verifyWebhookSignature(payload: Buffer | string, signature: string): boolean {
    const config = env();
    const expected = createHmac("sha256", config.SUMSUB_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    try {
      return timingSafeEqual(
        Buffer.from(expected, "utf8"),
        Buffer.from(signature, "utf8"),
      );
    } catch {
      return false;
    }
  },
};
