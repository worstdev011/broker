import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  const t = messages.metadata;

  return {
    title: {
      default: t.title,
      template: '%s | COMFORTRADE',
    },
    description: t.description,
    keywords: locale === 'ru'
      ? ['валютный рынок', 'торговля', 'форекс', 'криптовалюта', 'финансовые рынки', 'трейдинг']
      : locale === 'ua'
        ? ['валютний ринок', 'торгівля', 'форекс', 'криптовалюта', 'фінансові ринки', 'трейдинг']
        : ['currency market', 'trading', 'forex', 'cryptocurrency', 'financial markets'],
    openGraph: {
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : locale === 'ua' ? 'uk_UA' : 'en_US',
      siteName: 'COMFORTRADE',
      title: t.og_title,
      description: t.og_description,
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
