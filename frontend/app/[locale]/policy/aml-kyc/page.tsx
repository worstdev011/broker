'use client'

import Image from 'next/image'
import { Link } from '@/components/navigation'
import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'

export default function AMLKYCPage() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

      {/* Registration slide-out panel */}
      <>
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showRegisterPanel ? 'bg-transparent' : 'bg-transparent pointer-events-none'}`}
          onClick={() => setShowRegisterPanel(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#061230] shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out ${showRegisterPanel ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          aria-hidden={!showRegisterPanel}
        >
            <h2 id="panel-title" className="sr-only">{panelMode === 'login' ? 'Войти' : 'Регистрация'}</h2>
            <div className="relative pt-6 px-6 pb-0 border-b border-white/10">
              <button
                onClick={() => setShowRegisterPanel(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors z-10"
                aria-label="Закрыть"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex w-full">
                <button
                  type="button"
                  onClick={() => setPanelMode('register')}
                  className={`flex-1 pb-4 text-center text-lg font-medium transition-colors relative ${
                    panelMode === 'register' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Регистрация
                  {panelMode === 'register' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelMode('login')}
                  className={`flex-1 pb-4 text-center text-lg font-medium transition-colors relative ${
                    panelMode === 'login' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Вход
                  {panelMode === 'login' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white text-gray-800 font-medium hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Продолжить с Google
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#061230] text-gray-400">или</span>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    id="panel-email"
                    type="email"
                    placeholder=" "
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all"
                  />
                  <label
                    htmlFor="panel-email"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                  >
                    Email
                  </label>
                </div>
                <div className="relative group">
                  <input
                    id="panel-password"
                    type="password"
                    placeholder=" "
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all"
                  />
                  <label
                    htmlFor="panel-password"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                  >
                    Пароль
                  </label>
                </div>
                {panelMode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button type="button" className="text-sm text-[#3347ff] hover:text-[#2a3ae6] transition-colors">
                      Забыли пароль?
                    </button>
                  </div>
                )}
                {panelMode === 'register' && (
                  <div className="relative group">
                    <input
                      id="panel-promo"
                      type="text"
                      placeholder=" "
                      className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all"
                    />
                    <label
                      htmlFor="panel-promo"
                      className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                        top-1/2 -translate-y-1/2
                        peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                        peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                    >
                      Промокод <span className="text-gray-500/80">(опционально)</span>
                    </label>
                  </div>
                )}
                {panelMode === 'register' && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-[#3347ff] focus:ring-[#3347ff]/50"
                    />
                    <span className="text-sm text-gray-400">
                      Согласен с <Link href="/policy/terms" className="text-[#3347ff] hover:underline">условиями использования</Link> и <Link href="/policy/privacy" className="text-[#3347ff] hover:underline">политикой конфиденциальности</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg btn-accent text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={panelMode === 'register' && !agreeToTerms}
                >
                  {panelMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                </button>
              </form>
            </div>
            {panelMode === 'register' && (
              <div className="p-6 border-t border-white/10 bg-[#061230]">
                <p className="text-xs text-center text-gray-500 leading-relaxed">
                  Мы гарантируем защиту ваших данных. Перед началом работы ознакомьтесь с <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">Политикой использования</Link> и <Link href="/policy/aml-kyc" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">правилами AML/KYC</Link>.
                </p>
              </div>
            )}
          </div>
      </>

      <Footer />

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        aria-label="Наверх"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-lg btn-accent text-white shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-105'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  )
}
