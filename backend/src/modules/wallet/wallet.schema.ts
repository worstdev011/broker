import {
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_MAX_AMOUNT,
  WITHDRAW_MIN_AMOUNT,
  WITHDRAW_MAX_AMOUNT,
} from '../../config/constants.js';

export const depositSchema = {
  body: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: { type: 'number', minimum: DEPOSIT_MIN_AMOUNT, maximum: DEPOSIT_MAX_AMOUNT },
    },
  },
} as const;

export const withdrawSchema = {
  body: {
    type: 'object',
    required: ['amount', 'cardNumber'],
    properties: {
      amount: { type: 'number', minimum: WITHDRAW_MIN_AMOUNT, maximum: WITHDRAW_MAX_AMOUNT },
      cardNumber: { type: 'string', minLength: 16, maxLength: 23 },
      twoFactorCode: { type: 'string', pattern: '^\\d{6}$' },
    },
  },
} as const;

export const getBalanceSchema = {} as const;

export const walletWebhookSchema = {
  body: {
    type: 'object',
    additionalProperties: true,
    required: ['amount', 'orderId', 'sign', 'orderAmount'],
    properties: {
      // BetaTransfer webhook uses application/x-www-form-urlencoded,
      // so all payload fields come as strings.
      amount: { type: 'string' },
      orderAmount: { type: 'string' },
      paidAmount: { type: 'string' },
      commission: { type: 'string' },
      orderId: { type: 'string' },
      sign: { type: 'string' },
      // Provider may send status for full callbacks, but in some payloads it can be absent.
      status: { type: 'string' },
      id: { type: 'string' },
    },
  },
} as const;
