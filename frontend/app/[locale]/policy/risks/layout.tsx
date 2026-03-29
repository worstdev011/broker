import type { Metadata } from 'next';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await import(`../../../../messages/${locale}.json`)).default;
  const m = messages.metadata;
  return {
    title: m.policy_risks_title,
    description: m.policy_risks_description,
    keywords: m.policy_risks_keywords,
  };
}

export default function RisksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
