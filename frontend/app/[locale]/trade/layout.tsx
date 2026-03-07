import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Торговля',
  description: 'Открытие сделок, управление позициями, история торговли. Статистика по сделкам, процент побед, анализ доходности.',
  keywords: ['торговля', 'сделки', 'позиции', 'статистика', 'доходность', 'история сделок'],
  openGraph: {
    title: 'Торговля | COMFORTRADE',
    description: 'Открытие сделок, управление позициями, история торговли. Статистика и анализ доходности.',
    type: 'website',
  },
};

export default function TradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
