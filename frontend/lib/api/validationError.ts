/**
 * Parse API validation errors into user-friendly messages
 */

interface ZodIssue {
  validation?: string;
  code?: string;
  path?: (string | number)[];
  message?: string;
}

export interface ValidationMessageStrings {
  generic: string;
  fieldPassword: string;
  fieldEmail: string;
  fieldFallback: string;
  passwordMin6: string;
}

export const VALIDATION_FALLBACK_EN: ValidationMessageStrings = {
  generic: 'Validation error',
  fieldPassword: 'Password',
  fieldEmail: 'Email',
  fieldFallback: 'Field',
  passwordMin6: 'Password: at least 6 characters',
};

export function parseValidationError(data: unknown, s: ValidationMessageStrings = VALIDATION_FALLBACK_EN): string {
  if (typeof data !== 'object' || data === null) return s.generic;

  const obj = data as { error?: string; message?: string; details?: ZodIssue[] };

  if (obj.details && Array.isArray(obj.details)) {
    const messages = obj.details.map((issue) => {
      const field = issue.path?.[0];
      const fieldName =
        field === 'password' ? s.fieldPassword : field === 'email' ? s.fieldEmail : String(field ?? s.fieldFallback);
      if (issue.validation === 'regex' && field === 'password') {
        return s.passwordMin6;
      }
      if (issue.message) return `${fieldName}: ${issue.message}`;
      return obj.message || obj.error || s.generic;
    });
    return messages.filter(Boolean).join('. ') || obj.message || obj.error || s.generic;
  }

  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.error === 'string') return obj.error;
  return s.generic;
}
