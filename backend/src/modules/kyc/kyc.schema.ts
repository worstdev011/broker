import type { FastifySchema } from 'fastify';

export const kycInitSchema: FastifySchema = {
  tags: ['kyc'],
  summary: 'Initialise KYC session',
  description:
    'Creates a Sumsub applicant (if it does not exist yet) and returns a short-lived WebSDK access token.',
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', minLength: 1, description: 'Platform user ID' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        applicantId: { type: 'string' },
      },
    },
  },
};

export const kycWebhookSchema: FastifySchema = {
  tags: ['kyc'],
  summary: 'Sumsub webhook receiver',
  description:
    'Receives review events from Sumsub and verifies the X-Payload-Digest HMAC signature.',
  body: {
    type: 'object',
    additionalProperties: true,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
      },
    },
  },
};
