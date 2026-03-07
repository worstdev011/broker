'use client'

import Image from 'next/image'
import { Suspense, useState, useEffect, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/components/navigation'
import ReactCountryFlag from 'react-country-flag'
import { useAuth } from '@/lib/hooks/useAuth'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { INSTRUMENTS } from '@/lib/instruments'

function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  const parts = pair.split('/')
  if (parts.length !== 2) return [null, null]
  const [base, quote] = parts
  const currencyToCountry: Record<string, string> = {
    EUR: 'EU', USD: 'US', GBP: 'GB', JPY: 'JP', AUD: 'AU', CAD: 'CA', CHF: 'CH', NZD: 'NZ', NOK: 'NO', UAH: 'UA', BTC: 'US', ETH: 'US', SOL: 'US', BNB: 'US',
  }
  return [currencyToCountry[base] || null, currencyToCountry[quote] || null]
}

const NON_OTC_INSTRUMENTS = INSTRUMENTS.filter((i) => !i.label.includes('OTC'))

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading, login, register } = useAuth()
  const t = useTranslations('home')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')
  
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Redirect to terminal if authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/terminal')
    }
  }, [isAuthenticated, isLoading, router])

  // Открыть модалку логина при ?auth=login (редирект с терминала)
  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      setPanelMode('login')
      setShowRegisterPanel(true)
      router.replace('/')
    }
  }, [searchParams, router])

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    if (panelMode === 'register') {
      if (password !== confirmPassword) {
        setError(ta('passwords_mismatch'))
        setIsSubmitting(false)
        return
      }
      if (password.length < 8) {
        setError(ta('password_too_short'))
        setIsSubmitting(false)
        return
      }
      const hasUpper = /[A-Z]/.test(password)
      const hasLower = /[a-z]/.test(password)
      const hasNumber = /\d/.test(password)
      if (!hasUpper || !hasLower || !hasNumber) {
        setError(ta('password_requirements'))
        setIsSubmitting(false)
        return
      }
      if (!agreeToTerms) {
        setError(ta('agree_required'))
        setIsSubmitting(false)
        return
      }

      const result = await register(email, password)
      if (result.success) {
        setShowRegisterPanel(false)
        router.push('/terminal')
      } else {
        setError(result.error || ta('register_error'))
        setIsSubmitting(false)
        // Если email уже занят — переключаем на вкладку входа
        if (result.error?.includes(ta('email_already_registered'))) setPanelMode('login')
      }
    } else {
      const result = await login(email, password)
      if (result.success) {
        setShowRegisterPanel(false)
        router.push('/terminal')
      } else {
        setError(result.error || ta('login_error'))
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header and Hero Section with shared background */}
      <div className="bg-[#061230] relative overflow-hidden pt-16 sm:pt-20 md:pt-24">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/back1.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/back2.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        
        <SiteHeader
          onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
          onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
        />

        {/* Hero + Marquee wrapper: 100vh on mobile (header + hero + marquee all visible) */}
        <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] md:min-h-0 flex flex-col md:block">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col justify-center md:flex-initial md:justify-start py-10 sm:py-16 md:py-32 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="grid md:grid-cols-[1fr_1.25fr] gap-12 items-center">
              {/* Left Column - Text Content */}
              <div className="space-y-8 text-center md:text-left">
                {/* Rating badge - mobile only */}
                <div className="md:hidden flex justify-center">
                  <div className="relative inline-block">
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-semibold text-sm shadow-lg" style={{ background: 'linear-gradient(135deg, #061230 0%, #0d1f4a 50%, #061230 100%)' }}>
                      <div className="flex gap-0.5 text-amber-400">
                        {[1,2,3,4,5].map((i) => (
                          <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span>{t('rating_short')}</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-[2.5rem] md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  {t('hero_title')}{' '}
                  <span className="relative inline-block">
                    COMFORTRADE
                    <Image
                      src="/images/star.png"
                      alt=""
                      width={24}
                      height={24}
                      className="absolute -top-2 -right-4 md:-top-3 md:-right-5 w-4 h-4 md:w-6 md:h-6 object-contain drop-shadow-lg"
                    />
                  </span>
                </h1>
                
                <p className="text-base text-gray-300 leading-relaxed max-w-sm sm:max-w-md md:max-w-lg mx-auto md:mx-0 font-extralight">
                  {t('hero_subtitle')}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button onClick={() => setShowRegisterPanel(true)} className="btn-accent text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition-colors w-fit min-w-[240px] sm:min-w-0 mx-auto sm:mx-0">
                    {tc('create_account')}
                  </button>
                  <button onClick={() => setShowRegisterPanel(true)} className="bg-transparent text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-lg font-semibold text-sm sm:text-base border border-white/50 hover:bg-white/10 transition-colors w-fit min-w-[240px] sm:min-w-0 mx-auto sm:mx-0">
                    {tc('open_demo')}
                  </button>
                </div>
              </div>

              {/* Right Column - Phone Image (hidden on mobile); column wider so image can scale up */}
              <div className="hidden md:flex items-center justify-end min-w-0">
                <Image
                  src="/images/hero.png?v=2"
                  alt={t('hero_alt')}
                  width={1000}
                  height={1667}
                  className="w-full h-auto max-w-[620px] xl:max-w-[700px]"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Company Logos Section - Бегущая строка */}
        <section className="flex-shrink-0 w-full py-8 md:py-12 px-4 relative z-10 overflow-hidden">
          <div className="relative w-full">
            <div className="flex animate-marquee gap-8 md:gap-12 whitespace-nowrap w-max" style={{ width: 'max-content' }}>
              {[...NON_OTC_INSTRUMENTS, ...NON_OTC_INSTRUMENTS, ...NON_OTC_INSTRUMENTS].map((inst, idx) => {
                const pair = inst.label.replace(' Real', '')
                const [country1, country2] = getCurrencyCountryCodes(pair)
                return (
                  <div key={`${inst.id}-${idx}`} className="flex items-center gap-2 shrink-0">
                    {country1 && (
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center">
                        <ReactCountryFlag
                          countryCode={country1}
                          svg
                          style={{ width: '24px', height: '24px', objectFit: 'cover', display: 'block' }}
                          title={country1}
                        />
                      </div>
                    )}
                    {country2 && (
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center -ml-2.5 relative z-10">
                        <ReactCountryFlag
                          countryCode={country2}
                          svg
                          style={{ width: '24px', height: '24px', objectFit: 'cover', display: 'block' }}
                          title={country2}
                        />
                      </div>
                    )}
                    <span className="text-gray-300 text-lg font-medium">{pair}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
        </div>
      </div>

      {/* Features Section */}
      <section className="pt-10 md:pt-16 pb-16 md:pb-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          {/* Page Indicator */}
          <div className="text-center mb-4">
            <span className="text-[#3347ff] text-base">{t('features_indicator')}</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-6 md:mb-8">
            {t('features_title')}
          </h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Feature 1 with Phone Image inside */}
            <div className="md:col-span-2 bg-white rounded-3xl feature-card-shadow flex gap-0 items-stretch overflow-hidden min-h-[320px]">
              {/* Feature 1 Content */}
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                  <Image src="/images/1.svg" alt={t('feature1_alt')} width={64} height={64} className="rounded-lg" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('feature1_title')}</h3>
                <p className="text-base font-medium text-[#7c7f9c]">
                  {t('feature1_desc')}
                </p>
              </div>

              {/* Phone Image - почти на всю высоту карточки, прижата к низу и немного левее */}
              <div className="flex-1 flex items-stretch px-0">
                <div className="relative w-full h-full flex items-end justify-start pl-2">
                  <Image
                    src="/images/second.png?v=2"
                    alt={t('terminal_interface_alt')}
                    width={300}
                    height={600}
                    className="w-auto h-full max-h-[92%] object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/2.svg" alt={t('feature2_alt')} width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('feature2_title')}</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                {t('feature2_desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/3.svg" alt={t('feature3_alt')} width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('feature3_title')}</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                {t('feature3_desc')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/4.svg" alt={t('feature4_alt')} width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('feature4_title')}</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                {t('feature4_desc')}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/5.svg" alt={t('feature5_alt')} width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('feature5_title')}</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                {t('feature5_desc')}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button onClick={() => setShowRegisterPanel(true)} className="btn-accent text-white px-8 py-4 rounded-lg font-semibold transition-colors">
              {t('open_trading_account')}
            </button>
          </div>
        </div>
      </section>

      {/* Third Block - Торговая платформа нового поколения (как на макете) */}
      <section className="pt-14 pb-12 md:pt-20 md:pb-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text + карточки в ряд */}
            <div className="space-y-6">
              <div>
                <span className="text-[#3347ff] text-base">{t('platform_indicator')}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {t('platform_title')}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {t('platform_desc')}
              </p>
              {/* Три карточки: белые, тень, иконка-закладка сверху */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="relative bg-white rounded-xl shadow-md pt-10 pb-6 px-6 flex flex-col items-start gap-3 text-left">
                  <div className="absolute -top-1.5 left-5 w-7 h-8 bg-[#ebedff] flex items-center justify-center shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}>
                    <svg className="w-3 h-3 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-gray-900 font-bold text-base leading-snug mt-1">
                    <div>{t('platform_card1_line1')}</div>
                    <div>{t('platform_card1_line2')}</div>
                    <div>{t('platform_card1_line3')}</div>
                  </div>
                </div>
                <div className="relative bg-white rounded-xl shadow-md pt-10 pb-6 px-6 flex flex-col items-start gap-3 text-left">
                  <div className="absolute -top-1.5 left-5 w-7 h-8 bg-[#ebedff] flex items-center justify-center shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}>
                    <svg className="w-3 h-3 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-gray-900 font-bold text-base leading-snug mt-1">
                    <div>{t('platform_card2_line1')}</div>
                    <div>{t('platform_card2_line2')}</div>
                    <div>{t('platform_card2_line3')}</div>
                  </div>
                </div>
                <div className="relative bg-white rounded-xl shadow-md pt-10 pb-6 px-6 flex flex-col items-start gap-3 text-left">
                  <div className="absolute -top-1.5 left-5 w-7 h-8 bg-[#ebedff] flex items-center justify-center shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}>
                    <svg className="w-3 h-3 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-gray-900 font-bold text-base leading-snug mt-1">
                    <div>{t('platform_card3_line1')}</div>
                    <div>{t('platform_card3_line2')}</div>
                    <div>{t('platform_card3_line3')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Квадрат с фоном как в хиро: картинки + цвет, лого слева сверху, телефон по центру */}
            <div className="relative flex items-center justify-center py-8">
              <div className="relative w-full max-w-[380px] md:max-w-[480px] lg:max-w-[560px] aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-[#061230]">
                <div className="absolute inset-0 opacity-85 scale-x-[-1]" style={{ backgroundImage: 'url(/images/back1.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                <div className="absolute inset-0 opacity-85 scale-x-[-1]" style={{ backgroundImage: 'url(/images/back2.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                <div className="absolute left-6 top-6 z-10 p-2">
                  <Image src="/images/logomin.png" alt="Comfortrade" width={132} height={55} className="h-11 w-auto object-contain md:h-[3.25rem]" />
                </div>
                <div className="absolute inset-0 z-10 flex items-end justify-center px-4 pt-4 pb-0">
                  <Image
                    src="/images/third.png?v=2"
                    alt={t('terminal_interface_alt')}
                    width={460}
                    height={920}
                    className="w-full h-auto max-h-[96%] object-contain object-bottom drop-shadow-2xl"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Email signup Block */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-[#061230] relative overflow-hidden rounded-2xl py-16 md:py-24 -mx-4 md:-mx-8 px-4 md:px-6 lg:px-8 flex justify-center">
            <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {t('newsletter_title')}
                </h2>
                <p className="text-gray-400 text-base md:text-lg">
                  {t('newsletter_desc')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-1 md:flex-initial md:min-w-[560px] md:w-[640px]">
                <input
                  type="email"
                  placeholder={t('newsletter_placeholder')}
                  className="flex-1 min-w-0 px-5 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-colors"
                />
                <button
                  type="button"
                  className="shrink-0 px-8 py-4 rounded-lg btn-accent text-white font-medium transition-colors"
                >
                  {tc('subscribe')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fourth Block - Bulletproof Security */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-end">
            {/* Left Column - Phone Image (без тени, увеличенная) */}
            <div className="relative flex items-end justify-center order-2 md:order-1">
              <div className="relative w-full h-auto max-w-xl">
                <Image
                  src="/images/fourth.png?v=2"
                  alt={t('security_alt')}
                  width={560}
                  height={1120}
                  className="w-full h-auto rounded-2xl"
                  priority
                />
              </div>
            </div>

            {/* Right Column - Text Content */}
            <div className="space-y-8 order-1 md:order-2">
              {/* Page Indicator */}
              <div>
                <span className="text-[#3347ff] text-base">{t('security_indicator')}</span>
              </div>

              {/* Main Heading */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {t('security_title')}
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                {t('security_desc')}
              </p>

              {/* Security Metrics Grid - в стиле макета */}
              <div className="grid grid-cols-2 gap-4 md:gap-5">
                {/* Security Incidents */}
                <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-none">0.</div>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#f3f4ff] flex items-center justify-center text-[#3347ff]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3a4 4 0 00-4 4v3H6.5A1.5 1.5 0 005 11.5v7A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0017.5 10H16V7a4 4 0 00-4-4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">{t('security_incidents')}</div>
                </div>

                {/* AES Encryption */}
                <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-none">
                      256 <span className="text-[#3347ff]">{t('security_bits')}</span>
                    </div>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#f3f4ff] flex items-center justify-center text-[#3347ff]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M5 7h14v10H5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">{t('security_aes')}</div>
                </div>

                {/* Encrypted Data */}
                <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-none">100%</div>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#f3f4ff] flex items-center justify-center text-[#3347ff]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">{t('security_encrypted')}</div>
                </div>

                {/* Security Certification */}
                <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-none">CISA+</div>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#f3f4ff] flex items-center justify-center text-[#3347ff]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">{t('security_cert')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Block */}
      <section className="py-16 md:py-24 bg-[#F8F8FA]">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              {t('testimonials_title')}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setShowRegisterPanel(true)} className="btn-accent text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                {tc('create_account')}
              </button>
              <Link href="/reviews" className="bg-white text-[#3347ff] px-6 py-3 rounded-lg font-medium border border-gray-300 hover:border-[#3347ff] transition-colors flex items-center justify-center">
                {t('all_reviews')}
              </Link>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Review Card 1 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                {t('review1_title')}
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                {t('review1_text')}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/11.jpg"
                    alt={t('review1_author')}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{t('review1_author')}</div>
                    <div className="text-sm text-gray-500">{t('review1_handle')}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(4)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Card 2 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                {t('review2_title')}
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                {t('review2_text')}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/22.jpg"
                    alt={t('review2_author')}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{t('review2_author')}</div>
                    <div className="text-sm text-gray-500">{t('review2_handle')}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Card 3 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                {t('review3_title')}
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                {t('review3_text')}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/33.jpg"
                    alt={t('review3_author')}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{t('review3_author')}</div>
                    <div className="text-sm text-gray-500">{t('review3_handle')}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Card 4 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                {t('review4_title')}
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                {t('review4_text')}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/44.jpg"
                    alt={t('review4_author')}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{t('review4_author')}</div>
                    <div className="text-sm text-gray-500">{t('review4_handle')}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Resources Block - закомментировано
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="mb-4">
              <span className="text-[#3347ff] text-base">07 — 08</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                Последние материалы
              </h2>
              <p className="text-lg text-gray-600 max-w-md">
                Статьи, руководства и новости о валютном рынке, крипте и торговле. Будьте в курсе трендов и обновлений платформы.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image src="/images/111.jpeg" alt="Торговля на валютном рынке" width={400} height={300} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span>Приложения</span><span>•</span><span>1 фев 2026</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Как начать торговать на валютном рынке: пошаговое руководство</h3>
                <a href="#" className="text-[#3347ff] font-medium flex items-center gap-2 hover:gap-3 transition-all">Читать далее</a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image src="/images/222.jpeg" alt="Торговля криптовалютами" width={400} height={300} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span>Продукты</span><span>•</span><span>1 фев 2026</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Торговля криптовалютами: BTC, ETH и другие активы</h3>
                <a href="#" className="text-[#3347ff] font-medium flex items-center gap-2 hover:gap-3 transition-all">Читать далее</a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image src="/images/333.jpeg" alt="Торговые инструменты" width={400} height={300} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span>Приложения</span><span>•</span><span>1 фев 2026</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">5 советов для успешной торговли на валютном рынке</h3>
                <a href="#" className="text-[#3347ff] font-medium flex items-center gap-2 hover:gap-3 transition-all">Читать далее</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* End Block - CTA + Terminal image (как на макете) */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-[1.05fr_1.4fr] gap-10 lg:gap-16 items-stretch">
            {/* Left: White card with CTA */}
            <div className="relative bg-white rounded-[32px] shadow-sm px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12 flex flex-col justify-center items-center text-center h-full overflow-hidden">
              <div className="absolute inset-0 bg-no-repeat opacity-95" style={{ backgroundImage: 'url(/images/bgdrop.png?v=2)', backgroundPosition: 'right 16px top 16px', backgroundSize: '18% auto' }} aria-hidden />
              <div className="relative z-10 flex flex-col justify-center items-center text-center w-full">
              {/* Page Indicator */}
              <div className="mb-4">
                <span className="text-[#3347ff] text-sm sm:text-base">{t('cta_indicator')}</span>
              </div>

              {/* Main Heading */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-gray-900 leading-tight mb-6">
                {t('cta_title_line1')}<br />
                {t('cta_title_line2')}<br />
                {t('cta_title_line3')}
              </h2>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={() => setShowRegisterPanel(true)}
                  className="btn-accent text-white px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
                >
                  {tc('create_account')}
                </button>
                <Link
                  href="/terminal"
                  className="bg-white text-[#3347ff] px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base border border-[#d7d9f0] hover:border-[#3347ff] hover:bg-[#f5f6ff] transition-colors flex items-center justify-center gap-2"
                >
                  {tc('open_demo')}
                </Link>
              </div>
              </div>
            </div>

            {/* Right: Terminal image */}
            <div className="w-full flex justify-center md:justify-end">
              <div className="relative w-full max-w-3xl">
                <Image
                  src="/images/hero.png?v=2"
                  alt={t('terminal_alt')}
                  width={960}
                  height={410}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Registration slide-out panel */}
      <>
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showRegisterPanel ? 'bg-transparent' : 'bg-transparent pointer-events-none'}`}
          onClick={() => {
            setShowRegisterPanel(false);
            setError('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setPromoCode('');
            setAgreeToTerms(false);
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
          }}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#0a1835] backdrop-blur-xl shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out border-l border-white/5 ${showRegisterPanel ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          aria-hidden={!showRegisterPanel}
        >
            <h2 id="panel-title" className="sr-only">{showForgotPassword ? ta('restore_password') : panelMode === 'login' ? ta('login_title') : ta('register_title')}</h2>
            {!showForgotPassword && (
            <div className="relative pt-8 px-6 pb-4">
              <div className="flex w-full gap-2 p-1 rounded-xl bg-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('register');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setPromoCode('');
                    setShowForgotPassword(false);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    panelMode === 'register' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {ta('register_title')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('login');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setPromoCode('');
                    setShowForgotPassword(false);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    panelMode === 'login' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {ta('login_title')}
                </button>
              </div>
            </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 pb-12">
              {showForgotPassword ? (
                <div className="space-y-5 pt-8">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 -ml-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {ta('back_to_login')}
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{ta('restore_password')}</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {ta('restore_password_desc')}
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="forgot-email" className="block text-xs font-medium text-gray-400 ml-1">{tc('email')}</label>
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder={tc('enter_email')}
                        className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!forgotPasswordEmail) {
                          setError(ta('enter_email_error'));
                          return;
                        }
                        setError('');
                        // TODO: вызвать API восстановления пароля
                        alert(ta('restore_alert'));
                      }}
                      className="w-full mt-4 py-3.5 rounded-xl btn-accent text-white font-semibold active:scale-[0.99] transition-all shadow-lg shadow-[#3347ff]/20"
                    >
                      {ta('restore_btn')}
                    </button>
                  </div>
                </div>
              ) : (
              <form className="space-y-5" onSubmit={handleFormSubmit}>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white font-medium hover:bg-white/12 transition-colors"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {tc('continue_with_google')}
                </button>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-[#0a1835] text-xs text-gray-500">{tc('or')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="panel-email" className="block text-xs font-medium text-gray-400 ml-1">{tc('email')}</label>
                  <input
                    id="panel-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={tc('enter_email')}
                    required
                    disabled={isSubmitting}
                    className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="panel-password" className="block text-xs font-medium text-gray-400 ml-1">{tc('password')}</label>
                  <input
                    id="panel-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tc('enter_password')}
                    required
                    minLength={8}
                    disabled={isSubmitting}
                    className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                  />
                  {panelMode === 'register' && (
                    <p className="text-xs text-gray-500 ml-1">{ta('password_hint')}</p>
                  )}
                </div>
                {panelMode === 'register' && (
                  <div className="space-y-2">
                    <label htmlFor="panel-confirm-password" className="block text-xs font-medium text-gray-400 ml-1">{tc('confirm_password')}</label>
                    <input
                      id="panel-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={tc('confirm_password')}
                      required
                      minLength={8}
                      disabled={isSubmitting}
                      className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                    />
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                {panelMode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-gray-400 hover:text-[#3347ff] transition-colors font-medium underline underline-offset-2 decoration-gray-600/30"
                    >
                      {ta('forgot_password')}
                    </button>
                  </div>
                )}
                {panelMode === 'register' && (
                  <div className="space-y-2">
                    <label htmlFor="panel-promo" className="block text-xs font-medium text-gray-400 ml-1">{tc('promo_code')} <span className="text-gray-600">({tc('optional')})</span></label>
                    <input
                      id="panel-promo"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder={tc('enter_promo')}
                      disabled={isSubmitting}
                      className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                    />
                  </div>
                )}
                {panelMode === 'register' && (
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-1 w-4 h-4 rounded border-white/30 bg-white/5 text-[#3347ff] focus:ring-[#3347ff]/50 focus:ring-offset-0 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                      {ta('agree_with')} <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('terms_link')}</Link> {ta('agree_and')} <Link href="/policy/privacy" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('privacy_link')}</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={(panelMode === 'register' && !agreeToTerms) || isSubmitting}
                  className="w-full py-3.5 rounded-xl btn-accent text-white font-semibold active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#3347ff]/20"
                >
                  {isSubmitting 
                    ? (panelMode === 'login' ? ta('logging_in') : ta('registering')) 
                    : (panelMode === 'login' ? tc('login') : ta('register_btn'))
                  }
                </button>
              </form>
              )}
            </div>
            {panelMode === 'register' ? (
              <div className="p-6 border-t border-white/10 bg-[#0a1835]/80">
                <p className="text-xs text-center text-gray-500 leading-relaxed font-medium">
                  {ta('data_protection')} <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('policy_link')}</Link> {ta('agree_and')} <Link href="/policy/aml-kyc" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('aml_link')}</Link>.
                </p>
              </div>
            ) : (
              <div className="p-6 border-t border-white/10 bg-[#0a1835]/80">
                <div>
                  <p className="text-xs text-center text-gray-500 mb-3 font-medium">{ta('follow_socials')}</p>
                  <div className="flex justify-center gap-4">
                    <a href="https://www.instagram.com/comfortrade/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Telegram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="YouTube">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
      </>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        aria-label={tc('up')}
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

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  )
}
