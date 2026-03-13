export const depositSchema = {
  body: {
    type: 'object',
    required: ['amount', 'paymentMethod'],
    properties: {
      amount: { type: 'number', minimum: 200, maximum: 1000 },
      paymentMethod: {
        type: 'string',
        enum: ['CARD', 'CRYPTO', 'BANK', 'APPLE_PAY', 'GOOGLE_PAY', 'PAYPAL', 'QIWI', 'YOOMONEY', 'WEBMONEY', 'SKRILL', 'NETELLER', 'ADVANCED_CASH', 'SBP'],
      },
    },
  },
} as const;

export const withdrawSchema = {
  body: {
    type: 'object',
    required: ['amount', 'paymentMethod'],
    properties: {
      amount: { type: 'number', minimum: 200, maximum: 1000 },
      paymentMethod: {
        type: 'string',
        enum: ['CARD', 'CRYPTO', 'BANK'],
      },
    },
  },
} as const;

export const getBalanceSchema = {} as const;
