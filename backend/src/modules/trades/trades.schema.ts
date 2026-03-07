/**
 * Trades request/response schemas for Fastify
 */

export const openTradeSchema = {
  body: {
    type: 'object',
    required: ['accountId', 'direction', 'amount', 'expirationSeconds', 'instrument'],
    properties: {
      accountId: {
        type: 'string',
      },
      direction: {
        type: 'string',
        enum: ['CALL', 'PUT'],
      },
      amount: {
        type: 'number',
        minimum: 0.01,
        maximum: 50000,
      },
      expirationSeconds: {
        type: 'number',
        minimum: 5,
        maximum: 300,
        multipleOf: 5,
      },
      instrument: {
        type: 'string',
        description: 'Trading instrument (e.g. EURUSD, BTCUSD)',
      },
    },
  },
} as const;

export const getTradesSchema = {
  // No body required
} as const;
