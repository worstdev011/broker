import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Перехватываем все пути, КРОМЕ: api, _next, images, uploads, статика
  matcher: [
    '/',
    '/(ru|en|ua)/:path*',
    // Исключаем служебные пути
    '/((?!api|_next|images|uploads|favicon.ico|.*\\..*).*)',
  ],
};
