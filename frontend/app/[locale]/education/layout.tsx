import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Обучение',
  description: 'Материалы и уроки по торговле на валютном и криптовалютном рынках. Технический анализ, стратегии торговли, управление рисками от COMFORTRADE.',
  keywords: ['обучение', 'уроки', 'торговля', 'стратегии', 'технический анализ', 'трейдинг'],
}

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
