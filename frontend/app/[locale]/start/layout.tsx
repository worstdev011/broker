import type { Metadata } from 'next';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const m = messages.metadata;
  return {
    title: m.start_page_title,
    description: m.start_page_description,
    keywords: m.start_page_keywords,
  };
}

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
