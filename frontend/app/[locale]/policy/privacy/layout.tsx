import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description: 'Политика конфиденциальности COMFORTRADE. Как мы собираем, используем и защищаем ваши персональные данные.',
  keywords: ['конфиденциальность', 'персональные данные', 'защита данных', 'privacy policy'],
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
