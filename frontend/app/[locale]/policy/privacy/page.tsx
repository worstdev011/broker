'use client'

import Image from 'next/image'
import { useState } from 'react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function PrivacyPage() {
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">Политика конфиденциальности</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Как мы собираем, используем и защищаем вашу персональную информацию
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Сбор информации</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы собираем информацию, которую вы предоставляете при регистрации и использовании платформы, 
              включая имя, email, номер телефона, платежную информацию и документы для верификации. 
              Также мы автоматически собираем техническую информацию о вашем устройстве и использовании платформы.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Использование информации</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Мы используем собранную информацию для:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Предоставления и улучшения наших услуг</li>
              <li>Обработки транзакций и управления вашим счетом</li>
              <li>Соблюдения правовых и нормативных требований</li>
              <li>Связи с вами по вопросам обслуживания</li>
              <li>Предотвращения мошенничества и обеспечения безопасности</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Защита данных</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы применяем современные технологии шифрования и безопасности для защиты ваших персональных 
              данных от несанкционированного доступа, изменения, раскрытия или уничтожения. Все данные 
              передаются по защищенным каналам связи.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Передача данных третьим лицам</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы не продаем ваши персональные данные третьим лицам. Мы можем передавать информацию только 
              в случаях, предусмотренных законом, или для предоставления услуг (например, платежным системам, 
              банкам-партнерам), при условии соблюдения ими конфиденциальности.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Ваши права</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Вы имеете право:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Получать доступ к своим персональным данным</li>
              <li>Исправлять неточные данные</li>
              <li>Запрашивать удаление данных (в случаях, предусмотренных законом)</li>
              <li>Отозвать согласие на обработку данных</li>
              <li>Подать жалобу в надзорный орган</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Cookies</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы используем cookies для улучшения работы сайта, аналитики и персонализации контента. 
              Вы можете управлять настройками cookies в своем браузере.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Изменения в политике</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы можем периодически обновлять данную политику конфиденциальности. О существенных изменениях 
              мы уведомим вас по email или через уведомления на платформе.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Контакты</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              По вопросам конфиденциальности обращайтесь в службу поддержки через форму обратной связи 
              на сайте или по электронной почте.
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
