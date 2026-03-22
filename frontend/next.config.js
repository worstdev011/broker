/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const backendUrl = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
    ],
  },
  // Проксируем /api/* и /uploads/* на бэкенд - cookies работают только при same-origin запросах
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
}

module.exports = withNextIntl(nextConfig)
