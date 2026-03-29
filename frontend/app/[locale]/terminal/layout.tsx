import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

type TerminalMetadata = {
  metadata: {
    terminal_title: string;
    terminal_description: string;
    terminal_keywords: string[];
    terminal_og_title: string;
    terminal_og_description: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale;
  const messages = (await import(`../../../messages/${locale}.json`)).default as TerminalMetadata;
  const m = messages.metadata;

  return {
    title: m.terminal_title,
    description: m.terminal_description,
    keywords: m.terminal_keywords,
    openGraph: {
      title: m.terminal_og_title,
      description: m.terminal_og_description,
      type: 'website',
    },
  };
}

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
