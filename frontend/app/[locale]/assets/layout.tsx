import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Торговые инструменты',
  description: 'Валютные пары (Forex), криптовалюты, OTC инструменты и другие активы для торговли на COMFORTRADE. Актуальные котировки и торговые условия.',
  keywords: ['активы', 'валютные пары', 'криптовалюта', 'инструменты', 'forex', 'торговля'],
}

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
