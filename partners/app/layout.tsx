import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import { PartnersAuthProvider } from '@/components/providers/PartnersAuthProvider';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ComforTrade Partners',
  description: 'Партнёрская программа ComforTrade — RevShare до 80%, гибкий CPA, Hybrid',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${montserrat.variable}`}>
      <body>
        <PartnersAuthProvider>
          {children}
        </PartnersAuthProvider>
      </body>
    </html>
  );
}
