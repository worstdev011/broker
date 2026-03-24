'use client'

import Image from 'next/image'
import { useState } from 'react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function TermsPage() {
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader
        onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
        onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
      />

      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-6 md:px-8 relative z-10 pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">Условия использования</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Правила и условия использования платформы COMFORTRADE
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Принятие условий</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Используя платформу COMFORTRADE, вы соглашаетесь с данными условиями использования. 
              Если вы не согласны с какими-либо условиями, пожалуйста, не используйте нашу платформу.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Регистрация и учетная запись</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Для использования платформы необходимо:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Быть не младше 18 лет</li>
              <li>Предоставить точную и актуальную информацию при регистрации</li>
              <li>Поддерживать безопасность своей учетной записи</li>
              <li>Нести ответственность за все действия, совершенные под вашей учетной записью</li>
              <li>Немедленно уведомлять нас о любом несанкционированном использовании</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Использование платформы</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Вы обязуетесь использовать платформу только в законных целях и не будете:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Использовать платформу для незаконной деятельности</li>
              <li>Пытаться получить несанкционированный доступ к системе</li>
              <li>Использовать автоматизированные системы для торговли без разрешения</li>
              <li>Распространять вредоносное программное обеспечение</li>
              <li>Нарушать права интеллектуальной собственности</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Финансовые операции</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Все финансовые операции на платформе являются окончательными после их подтверждения. 
              Вы несете ответственность за все сделки, совершенные с использованием вашей учетной записи. 
              Мы оставляем за собой право отменить или заблокировать любую транзакцию при подозрении 
              в мошенничестве или нарушении условий.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Комиссии и платежи</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы взимаем комиссии за определенные операции, о которых вы будете уведомлены заранее. 
              Все комиссии указаны на платформе и могут быть изменены с предварительным уведомлением. 
              Вы несете ответственность за все налоги, связанные с вашей торговой деятельностью.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Интеллектуальная собственность</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Все материалы на платформе, включая дизайн, логотипы, тексты и программное обеспечение, 
              являются собственностью COMFORTRADE и защищены законами об интеллектуальной собственности. 
              Вы не имеете права копировать, распространять или использовать эти материалы без нашего 
              письменного разрешения.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Ограничение ответственности</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              COMFORTRADE предоставляет платформу "как есть" и не гарантирует бесперебойную работу 
              или отсутствие ошибок. Мы не несем ответственности за любые прямые, косвенные или 
              случайные убытки, возникшие в результате использования или невозможности использования платформы.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Изменение условий</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы оставляем за собой право изменять данные условия использования в любое время. 
              О существенных изменениях мы уведомим вас по email или через уведомления на платформе. 
              Продолжение использования платформы после изменений означает ваше согласие с новыми условиями.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Прекращение обслуживания</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы оставляем за собой право приостановить или прекратить доступ к вашей учетной записи 
              в случае нарушения условий использования, подозрения в мошенничестве или по другим 
              законным причинам.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Применимое право</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Данные условия использования регулируются и толкуются в соответствии с законодательством 
              юрисдикции, в которой зарегистрирована компания COMFORTRADE.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Контакты</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              По вопросам, связанным с условиями использования, обращайтесь в службу поддержки 
              через форму обратной связи на сайте или по электронной почте.
            </p>
          </div>
        </div>
      </section>

      <AuthSlidePanel open={showRegisterPanel} onClose={() => setShowRegisterPanel(false)} initialMode={panelMode} />

      <Footer />

      <ScrollToTop />
    </div>
  )
}
