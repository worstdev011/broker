import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Профиль пользователя',
  description: 'Управление профилем, настройки безопасности, история сделок, пополнение и вывод средств. Двухфакторная аутентификация и управление активными сессиями.',
  keywords: ['профиль', 'настройки', 'безопасность', '2FA', 'сессии', 'история сделок'],
  openGraph: {
    title: 'Профиль пользователя | COMFORTRADE',
    description: 'Управление профилем, настройки безопасности, история сделок. 2FA и управление сессиями.',
    type: 'website',
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
