import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Регистрация',
  description: 'Создайте аккаунт в COMFORTRADE и начните торговать на валютном рынке. Быстрая регистрация, демо-счет для практики, доступ к профессиональным инструментам торговли.',
  keywords: ['регистрация', 'создать аккаунт', 'демо счет', 'начать торговлю'],
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
