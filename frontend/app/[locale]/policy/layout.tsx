import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политики и документы',
  description: 'Политики конфиденциальности, условия использования, политика AML/KYC и предупреждения о рисках COMFORTRADE.',
  keywords: ['политика', 'условия', 'конфиденциальность', 'риски', 'документы'],
};

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
