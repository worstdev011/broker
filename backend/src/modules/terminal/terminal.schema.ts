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
    },
  },
} as const;
