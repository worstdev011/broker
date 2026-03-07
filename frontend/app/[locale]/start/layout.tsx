import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Как начать торговлю',
  description: 'Пошаговое руководство по началу торговли на COMFORTRADE. Регистрация аккаунта, верификация, пополнение счета, открытие первых сделок.',
  keywords: ['как начать', 'руководство', 'первые шаги', 'регистрация', 'верификация', 'демо счет'],
}

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
