'use client'

import Image from 'next/image'
import { useState } from 'react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function RisksPage() {
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">Предупреждение о рисках</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Важная информация о рисках, связанных с торговлей на финансовых рынках
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8">
            <h3 className="text-lg font-bold text-red-900 mb-2">Важное предупреждение</h3>
            <p className="text-red-800">
              Торговля на финансовых рынках сопряжена с высоким уровнем риска и может привести к потере 
              ваших инвестиций. Никогда не инвестируйте больше, чем вы можете позволить себе потерять.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Риски торговли</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Торговля финансовыми инструментами, включая валютные пары, криптовалюты и другие активы, 
              несет в себе существенные риски. Цены могут изменяться быстро и непредсказуемо, что может 
              привести к значительным потерям.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Основные виды рисков</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Рыночный риск</h3>
              <p className="text-gray-700 leading-relaxed">
                Цены на финансовые инструменты могут изменяться в результате различных факторов, 
                включая экономические события, политические изменения, природные катастрофы и другие 
                непредвиденные обстоятельства.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Риск ликвидности</h3>
              <p className="text-gray-700 leading-relaxed">
                В определенных рыночных условиях может быть сложно или невозможно закрыть позицию 
                по желаемой цене из-за недостаточной ликвидности рынка.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Технический риск</h3>
              <p className="text-gray-700 leading-relaxed">
                Сбои в работе платформы, интернет-соединения или технические проблемы могут повлиять 
                на возможность совершения сделок в нужный момент.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Риск кредитного плеча</h3>
              <p className="text-gray-700 leading-relaxed">
                Использование кредитного плеча увеличивает как потенциальную прибыль, так и потенциальные 
                убытки. Небольшие движения цены могут привести к значительным потерям.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Рекомендации по управлению рисками</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Никогда не инвестируйте больше, чем можете позволить себе потерять</li>
              <li>Используйте стоп-лоссы для ограничения потенциальных убытков</li>
              <li>Диверсифицируйте свои инвестиции</li>
              <li>Не торгуйте на эмоциях</li>
              <li>Регулярно обучайтесь и изучайте рынок</li>
              <li>Ведите торговый дневник</li>
              <li>Следуйте своей торговой стратегии</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Ответственность</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Вы несете полную ответственность за все решения, принимаемые при торговле на платформе. 
              COMFORTRADE не несет ответственности за ваши торговые решения и их последствия. 
              Убедитесь, что вы полностью понимаете риски перед началом торговли.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Консультации</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Если вы не уверены в своих знаниях или не понимаете риски, связанные с торговлей, 
              рекомендуется проконсультироваться с независимым финансовым консультантом перед началом торговли.
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
