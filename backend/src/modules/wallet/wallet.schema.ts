export const depositSchema = {
  body: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: { type: 'number', minimum: 300, maximum: 29999 },
    },
  },
} as const;

export const withdrawSchema = {
  body: {
    type: 'object',
    required: ['amount', 'cardNumber'],
    properties: {
      amount: { type: 'number', minimum: 300, maximum: 29999 },
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
    required: ['amount', 'orderId', 'sign'],
    properties: {
      amount: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      orderId: { type: 'string' },
      sign: { type: 'string' },
      status: { type: 'string' },
      id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
    },
  },
} as const;
