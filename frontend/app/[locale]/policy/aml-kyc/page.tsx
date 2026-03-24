'use client'

import Image from 'next/image'
import { useState } from 'react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function AMLKYCPage() {
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">AML/KYC Политика</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Политика противодействия отмыванию денег и требования по идентификации клиентов
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Общие положения</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              COMFORTRADE придерживается строгих стандартов в области противодействия отмыванию денег (AML) 
              и соблюдения требований по идентификации клиентов (KYC). Мы обязуемся соблюдать все применимые 
              законы и нормативные акты, направленные на предотвращение финансовых преступлений.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Идентификация клиентов (KYC)</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              При регистрации и в процессе работы мы требуем от клиентов предоставления следующих документов:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Документ, удостоверяющий личность (паспорт, водительские права или национальное удостоверение)</li>
              <li>Подтверждение адреса проживания (не старше 3 месяцев)</li>
              <li>Дополнительные документы по запросу в случае необходимости</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Мониторинг транзакций</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Мы осуществляем постоянный мониторинг всех транзакций на предмет подозрительной активности. 
              Любые необычные операции могут быть заблокированы для дополнительной проверки. Мы оставляем 
              за собой право запросить дополнительную информацию о происхождении средств.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Отказ в обслуживании</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              COMFORTRADE оставляет за собой право отказать в обслуживании любому клиенту, который не 
              предоставляет необходимую документацию или чья деятельность вызывает подозрения в нарушении 
              законодательства.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Контакты</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              По вопросам, связанным с AML/KYC политикой, обращайтесь в службу поддержки через форму 
              обратной связи на сайте или по электронной почте.
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
