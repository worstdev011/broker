import { createHash, timingSafeEqual } from 'crypto';
import { URLSearchParams } from 'url';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors/AppError.js';

export class BetaTransferService {
  constructor(
    private readonly publicKey: string,
    private readonly secretKey: string,
  ) {}

  private createSign(data: Record<string, string | number>): string {
    const values = Object.values(data).map((v) => String(v)).join('');
    return createHash('md5').update(values + this.secretKey).digest('hex');
  }

  /** Редирект пользователя на страницу оплаты BetaTransfer */
  async createPayment(params: {
    amount: number;
    orderId: string;
    payerId: string;
    successUrl?: string;
    failUrl?: string;
  }): Promise<string> {
    const data: Record<string, string | number> = {
      amount: params.amount,
      currency: 'UAH',
      paymentSystem: 'Card',
      orderId: params.orderId,
      payerId: params.payerId,
      // Request full webhook callbacks (success + fail/cancel).
      fullCallback: '1',
      redirect: 'true',
    };

    if (params.successUrl) data.successUrl = params.successUrl;
    if (params.failUrl) data.failUrl = params.failUrl;

    const signed = { ...data, sign: this.createSign(data) };

    const url = `https://merchant.betatransfer.io/api/payment?token=${encodeURIComponent(this.publicKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(
        Object.entries(signed).map(([k, v]) => [k, String(v)]) as [string, string][],
      ),
      redirect: 'manual',
    });

    const redirectUrl = response.headers.get('location');
    if (!redirectUrl) {
      const body = await response.text();
      throw new AppError(
        502,
        `BetaTransfer payment creation failed (${response.status}): ${body.slice(0, 500)}`,
        'BETATRANSFER_PAYMENT_FAILED',
      );
    }

    return redirectUrl;
  }

  async createWithdrawal(params: {
    amount: number;
    orderId: string;
    cardNumber: string;
    payerId: string;
  }): Promise<{ id: number; status: string }> {
    const payload: Record<string, string | number> = {
      amount: params.amount,
      currency: 'UAH',
      orderId: params.orderId,
      paymentSystem: 'Card',
      address: params.cardNumber,
      payerId: params.payerId,
    };

    const signed = { ...payload, sign: this.createSign(payload) };

    const url = `https://merchant.betatransfer.io/api/withdrawal-payment?token=${encodeURIComponent(this.publicKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(
        Object.entries(signed).map(([k, v]) => [k, String(v)]) as [string, string][],
      ),
    });

    const responseText = await response.text();
    let result: { status?: string; id?: number; message?: string };
    try {
      result = JSON.parse(responseText) as typeof result;
    } catch {
      throw new AppError(
        502,
        `BetaTransfer withdrawal: invalid JSON (${response.status}): ${responseText.slice(0, 300)}`,
        'BETATRANSFER_WITHDRAWAL_FAILED',
      );
    }

    if (result.status !== 'success' || result.id === undefined) {
      throw new AppError(
        502,
        `BetaTransfer withdrawal failed: ${JSON.stringify(result)}`,
        'BETATRANSFER_WITHDRAWAL_FAILED',
      );
    }

    return { id: result.id, status: result.status };
  }

  verifyWebhook(amount: string, orderId: string, receivedSign: string): boolean {
    const expected = createHash('md5')
      .update(String(amount) + String(orderId) + this.secretKey)
      .digest('hex')
      .toLowerCase();
    const got = String(receivedSign).toLowerCase();
    if (expected.length !== got.length) {
      return false;
    }
    try {
      return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(got, 'utf8'));
    } catch {
      return false;
    }
  }
}

let betaTransferInstance: BetaTransferService | null = null;

export function getBetaTransferService(): BetaTransferService {
  const publicKey = env.BETATRANSFER_PUBLIC_KEY;
  const secretKey = env.BETATRANSFER_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new AppError(503, 'Payment provider not configured', 'PAYMENT_NOT_CONFIGURED');
  }

  if (!betaTransferInstance) {
    betaTransferInstance = new BetaTransferService(publicKey, secretKey);
  }
  return betaTransferInstance;
}
