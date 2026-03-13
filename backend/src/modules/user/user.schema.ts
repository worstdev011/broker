export const getProfileSchema = {} as const;

export const updateProfileSchema = {
  body: {
    type: 'object',
    properties: {
      firstName: { type: 'string', minLength: 1, maxLength: 50 },
      lastName: { type: 'string', minLength: 1, maxLength: 50 },
      nickname: {
        type: 'string',
        pattern: '^@[a-zA-Z0-9_]{3,30}$',
      },
      phone: {
        type: 'string',
        pattern: '^\\+[1-9]\\d{1,14}$',
      },
      country: { type: 'string', maxLength: 100 },
      currency: { type: 'string', maxLength: 10 },
      dateOfBirth: {
        type: ['string', 'null'],
        format: 'date',
        nullable: true,
      },
      avatarUrl: { type: 'string', format: 'uri' },
    },
  },
} as const;

export const uploadAvatarSchema = {
  consumes: ['multipart/form-data'],
} as const;

export const deleteProfileSchema = {
  body: {
    type: 'object',
    required: ['password'],
    properties: {
      password: { type: 'string', minLength: 8 },
    },
  },
} as const;

export const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', minLength: 8 },
      newPassword: { type: 'string', minLength: 8 },
    },
  },
} as const;
