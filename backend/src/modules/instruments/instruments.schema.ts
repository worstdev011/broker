export const getInstrumentsSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          base: { type: 'string' },
          quote: { type: 'string' },
          digits: { type: 'number' },
          payoutPercent: { type: 'number' },
        },
        required: ['id', 'name', 'base', 'quote', 'digits', 'payoutPercent'],
      },
    },
  },
} as const;

export const updatePayoutSchema = {
  body: {
    type: 'object',
    required: ['payoutPercent'],
    properties: {
      payoutPercent: {
        type: 'number',
        minimum: 60,
        maximum: 90,
      },
    },
  },
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
} as const;
