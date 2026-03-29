import type { Metadata } from 'next';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const m = messages.metadata;
  return {
    title: m.reviews_page_title,
    description: m.reviews_page_description,
    keywords: m.reviews_page_keywords,
  };
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
