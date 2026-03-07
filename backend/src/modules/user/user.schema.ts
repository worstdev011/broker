/**
 * User request/response schemas for Fastify
 * FLOW U1: Base Profile validation
 */

export const getProfileSchema = {
  // No body required
} as const;

export const updateProfileSchema = {
  body: {
    type: 'object',
    properties: {
      firstName: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
      },
      lastName: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
      },
      nickname: {
        type: 'string',
        pattern: '^@[a-zA-Z0-9_]{3,30}$',
        description: 'Nickname must start with @ and contain 3-30 alphanumeric characters or underscores',
      },
      phone: {
        type: 'string',
        pattern: '^\\+[1-9]\\d{1,14}$',
        description: 'Phone number in E.164 format (e.g., +380991234567)',
      },
      country: {
        type: 'string',
        maxLength: 100,
      },
      currency: {
        type: 'string',
        maxLength: 10,
        description: 'Account currency code (e.g., USD, EUR). Set once, cannot be changed.',
      },
      dateOfBirth: {
        type: ['string', 'null'],
        format: 'date',
        nullable: true,
        description: 'Date of birth in ISO format (YYYY-MM-DD)',
      },
      avatarUrl: {
        type: 'string',
        format: 'uri',
      },
    },
  },
} as const;

export const uploadAvatarSchema = {
  consumes: ['multipart/form-data'],
} as const;

// 🔥 FLOW U1.9: Delete profile schema
export const deleteProfileSchema = {
  body: {
    type: 'object',
    required: ['password'],
    properties: {
      password: {
        type: 'string',
        minLength: 8,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
} as const;

// 🔥 FLOW U2: Change password schema
export const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: {
        type: 'string',
        minLength: 8,
        description: 'Current password',
      },
      newPassword: {
        type: 'string',
        minLength: 8,
        description: 'New password (minimum 8 characters)',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
} as const;
