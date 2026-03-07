import type { Metadata } from 'next';
import { ToastProvider } from '@/components/providers/ToastProvider';

export const metadata: Metadata = {
  title: 'Торговый терминал',
  description: 'Профессиональный торговый терминал для торговли на финансовых рынках. Графики свечей и линейные графики, технические индикаторы, инструменты рисования, анализ рынка в реальном времени.',
  keywords: ['торговый терминал', 'графики', 'технический анализ', 'индикаторы', 'валютный рынок', 'трейдинг'],
  openGraph: {
    title: 'Торговый терминал | COMFORTRADE',
    description: 'Профессиональный торговый терминал для торговли на финансовых рынках. Графики, индикаторы, анализ в реальном времени.',
    type: 'website',
  },
};

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
