/** Strip HTML tags and control characters to prevent XSS */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}
