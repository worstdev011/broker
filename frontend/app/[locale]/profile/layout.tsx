import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

type ProfileLayoutMetadata = {
  metadata: {
    profile_title: string;
    profile_description: string;
    profile_keywords: string[];
    profile_og_title: string;
    profile_og_description: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale;
  const messages = (await import(`../../../messages/${locale}.json`)).default as ProfileLayoutMetadata;
  const m = messages.metadata;

  return {
    title: m.profile_title,
    description: m.profile_description,
    keywords: m.profile_keywords,
    openGraph: {
      title: m.profile_og_title,
      description: m.profile_og_description,
      type: 'website',
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
