import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Предупреждение о рисках',
  description: 'Предупреждение о рисках торговли на валютном рынке. Торговля на финансовых рынках сопряжена с рисками потери капитала.',
  keywords: ['риски', 'предупреждение', 'потеря капитала', 'финансовые риски'],
};

export default function RisksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
