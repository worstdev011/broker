import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const REF_CODE_REGEX = /^[A-Z0-9]{1,20}$/;
const REF_COOKIE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request) as NextResponse;

  const ref = request.nextUrl.searchParams.get('ref');
  if (ref && REF_CODE_REGEX.test(ref)) {
    response.cookies.set('ref_code', ref, {
      maxAge: REF_COOKIE_TTL,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // Перехватываем все пути, КРОМЕ: api, _next, images, uploads, статика
  matcher: [
    '/',
    '/(ru|en|ua)/:path*',
    // Исключаем служебные пути
    '/((?!api|_next|images|uploads|favicon.ico|.*\\..*).*)',
  ],
};
