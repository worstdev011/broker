import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Отзывы клиентов',
  description: 'Отзывы и мнения клиентов о COMFORTRADE. Реальные истории трейдеров, их опыт торговли на валютном рынке и работа с платформой.',
  keywords: ['отзывы', 'клиенты', 'мнения', 'рейтинг', 'COMFORTRADE'],
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
