import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "../shared/types/env.js";
import { logger } from "../shared/logger.js";
import { AppError } from "../shared/errors/AppError.js";

const BETATRANSFER_BASE = "https://merchant.betatransfer.io/api";

function createSign(data: Record<string, string | number>, secretKey: string): string {
  const raw = Object.values(data).map((v) => String(v)).join("") + secretKey;
  return createHash("md5").update(raw).digest("hex");
}

export const betaTransferService = {
  async createPayment(data: {
    transactionId: string;
    amount: number;
    currency: string;
    userId: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    const config = env();
    const locale = config.FRONTEND_DEFAULT_LOCALE || "ru";
    const base = config.FRONTEND_URL.replace(/\/$/, "");

    const payload: Record<string, string | number> = {
      amount: data.amount,
      currency: data.currency,
      paymentSystem: "Card",
      orderId: data.transactionId,
      payerId: data.userId,
      fullCallback: "1",
      redirect: "true",
      successUrl: `${base}/${locale}/profile?tab=wallet&deposit=success`,
      failUrl: `${base}/${locale}/profile?tab=wallet&deposit=fail`,
    };

    const signed = { ...payload, sign: createSign(payload, config.BETATRANSFER_SECRET_KEY) };

    const url = `${BETATRANSFER_BASE}/payment?token=${encodeURIComponent(config.BETATRANSFER_PUBLIC_KEY)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(
        Object.entries(signed).map(([k, v]) => [k, String(v)]),
      ),
      redirect: "manual",
    });

    // BetaTransfer may return a 302 redirect or a JSON body with the URL
    const redirectUrl = response.headers.get("location");
    if (redirectUrl) {
      return { paymentUrl: redirectUrl, externalId: data.transactionId };
    }

    const responseText = await response.text();

    try {
      const json = JSON.parse(responseText) as { url?: string; payment_url?: string; link?: string };
      const paymentUrl = json.url || json.payment_url || json.link;
      if (paymentUrl) {
        return { paymentUrl, externalId: data.transactionId };
      }
    } catch {
      // not JSON
    }

    logger.error({ status: response.status, body: responseText.slice(0, 1000) }, "BetaTransfer createPayment failed");
    throw new AppError("BETATRANSFER_PAYMENT_FAILED", `BetaTransfer payment creation failed (${response.status}): ${responseText.slice(0, 500)}`, 502);
  },

  async createWithdrawal(data: {
    transactionId: string;
    amount: number;
    currency: string;
    cardNumber: string;
    userId: string;
  }): Promise<{ externalId: string }> {
    const config = env();

    const payload: Record<string, string | number> = {
      amount: data.amount,
      currency: data.currency,
      orderId: data.transactionId,
      paymentSystem: "Card",
      address: data.cardNumber,
      payerId: data.userId,
    };

    const signed = { ...payload, sign: createSign(payload, config.BETATRANSFER_SECRET_KEY) };

    const url = `${BETATRANSFER_BASE}/withdrawal-payment?token=${encodeURIComponent(config.BETATRANSFER_PUBLIC_KEY)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(
        Object.entries(signed).map(([k, v]) => [k, String(v)]),
      ),
    });

    const responseText = await response.text();
    let result: { status?: string; id?: number; message?: string };
    try {
      result = JSON.parse(responseText) as typeof result;
    } catch {
      throw new AppError("BETATRANSFER_WITHDRAWAL_FAILED", `BetaTransfer withdrawal: invalid JSON (${response.status}): ${responseText.slice(0, 300)}`, 502);
    }

    if (result.status !== "success" || result.id === undefined) {
      logger.error({ result }, "BetaTransfer createWithdrawal failed");
      throw new AppError("BETATRANSFER_WITHDRAWAL_FAILED", `BetaTransfer withdrawal failed: ${JSON.stringify(result)}`, 502);
    }

    return { externalId: String(result.id) };
  },

  verifySignature(amount: string, orderId: string, signature: string): boolean {
    const config = env();
    const expected = createHash("md5")
      .update(String(amount) + String(orderId) + config.BETATRANSFER_SECRET_KEY)
      .digest("hex")
      .toLowerCase();
    const got = String(signature).toLowerCase();

    if (expected.length !== got.length) return false;

    try {
      return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(got, "utf8"));
    } catch {
      return false;
    }
  },
};
