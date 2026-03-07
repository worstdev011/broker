import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Кошелек',
  description: 'Пополнение и вывод средств. Банковские карты, криптовалюта, банковские переводы. Управление балансом и история транзакций.',
  keywords: ['кошелек', 'пополнение', 'вывод средств', 'баланс', 'транзакции', 'платежи'],
  openGraph: {
    title: 'Кошелек | COMFORTRADE',
    description: 'Пополнение и вывод средств. Карты, криптовалюта, банковские переводы. Управление балансом.',
    type: 'website',
  },
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
