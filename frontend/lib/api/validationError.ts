/**
 * Parse API validation errors into user-friendly messages
 */

interface ZodIssue {
  validation?: string;
  code?: string;
  path?: (string | number)[];
  message?: string;
}

export function parseValidationError(data: unknown): string {
  if (typeof data !== 'object' || data === null) return 'Ошибка валидации';

  const obj = data as { error?: string; message?: string; details?: ZodIssue[] };

  if (obj.details && Array.isArray(obj.details)) {
    const messages = obj.details.map((issue) => {
      const field = issue.path?.[0];
      const fieldName = field === 'password' ? 'Пароль' : field === 'email' ? 'Email' : field || 'Поле';
      if (issue.validation === 'regex' && field === 'password') {
        return 'Пароль: минимум 6 символов';
      }
      if (issue.message) return `${fieldName}: ${issue.message}`;
      return obj.message || obj.error || 'Ошибка валидации';
    });
    return messages.filter(Boolean).join('. ') || obj.message || obj.error || 'Ошибка валидации';
  }

  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.error === 'string') return obj.error;
  return 'Ошибка валидации';
}
