import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Условия использования',
  description: 'Условия использования платформы COMFORTRADE. Правила торговли, права и обязанности пользователей, условия предоставления услуг.',
  keywords: ['условия использования', 'правила', 'соглашение', 'услуги'],
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
