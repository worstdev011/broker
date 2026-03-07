/**
 * Terminal snapshot request/response schemas for Fastify
 */

export const getSnapshotSchema = {
  querystring: {
    type: 'object',
    properties: {
      instrument: {
        type: 'string',
        default: 'EURUSD_OTC',
        description: 'Instrument id: EURUSD_OTC, EURUSD_REAL, AUDCAD_OTC, …',
      },
      timeframe: {
        type: 'string',
        enum: ['5s', '10s', '15s', '30s', '1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1d'],
        default: '5s',
      },
    },
  },
} as const;
