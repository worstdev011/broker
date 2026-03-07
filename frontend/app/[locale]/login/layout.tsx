import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход в аккаунт',
  description: 'Войдите в свой аккаунт COMFORTRADE для доступа к торговому терминалу, управлению профилем и истории сделок.',
  keywords: ['вход', 'авторизация', 'логин', 'аккаунт'],
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
