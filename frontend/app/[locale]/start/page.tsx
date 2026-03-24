'use client'

import Image from 'next/image'
import { Link } from '@/components/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, Wallet, TrendUp, CaretLeft, CaretRight } from '@phosphor-icons/react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function StartPage() {
  const t = useTranslations('start')
  const tc = useTranslations('common')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [educationSlide, setEducationSlide] = useState(0)

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader
        activeNav="start"
        onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
        onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
      />

      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-6 md:px-8 relative z-10 pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label={t('breadcrumb_aria')}>
                <Link href="/" className="hover:text-white transition-colors">{t('breadcrumb_home')}</Link>
                <span className="text-gray-500">→</span>
                <span className="text-white">{t('title')}</span>
              </nav>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">{t('title')}</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-12 items-start">
            <div>
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A3C] leading-tight">
                  {t('section_title')}
                </h2>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#1A1A3C] mt-1">
                  {t('section_subtitle')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1 */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <div className="flex gap-3 items-start mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3347ff]/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-[#3347ff]" weight="bold" aria-hidden />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 pt-1">{t('step1_title')}</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed pl-0">
                  {t('step1_desc')}
                </p>
              </div>

                {/* Step 2 */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <div className="flex gap-3 items-start mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3347ff]/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[#3347ff]" weight="bold" aria-hidden />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 pt-1">{t('step2_title')}</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed pl-0">
                  {t('step2_desc')}
                </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <div className="flex gap-3 items-start mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3347ff]/10 flex items-center justify-center">
                    <TrendUp className="w-5 h-5 text-[#3347ff]" weight="bold" aria-hidden />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 pt-1">{t('step3_title')}</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed pl-0">
                  {t('step3_desc')}
                </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button onClick={() => { setPanelMode('register'); setShowRegisterPanel(true); }} className="btn-accent text-white px-8 py-4 rounded-xl font-medium transition-colors text-center">
                  {tc('create_account')}
                </button>
                <Link href="/terminal" className="bg-white text-[#3347ff] px-8 py-4 rounded-xl font-medium border-2 border-[#3347ff] hover:bg-[#3347ff]/5 transition-colors text-center flex items-center justify-center">
                  {tc('open_demo')}
                </Link>
              </div>
            </div>
            </div>

            {/* Картинка harf справа, прижата к низу секции */}
            <div className="flex justify-end pt-8 md:pt-0 md:self-end md:-mb-16 lg:-mb-24">
              <Image
                src="/images/harf.png"
                alt=""
                width={600}
                height={520}
                className="max-w-[380px] md:max-w-[480px] lg:max-w-[560px] h-auto"
                priority
              />
            </div>
          </div>
        </div>

        {/* Что нужно для старта - фон чуть шире контейнера, контент чуть уже */}
        <div className="container mx-auto px-4 mt-16 md:mt-24">
          <div className="-mx-6 md:-mx-12 lg:-mx-20 rounded-3xl overflow-hidden bg-[#061230] relative py-16 md:py-24">
            <div className="absolute inset-0 opacity-85 rounded-3xl" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            <div className="relative z-10 px-8 md:px-14 lg:px-20">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-8 md:mb-10">
                {t('what_need_title')}
              </h2>
              
              <div className="relative max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {/* Карточка 1 */}
              <div className="bg-white rounded-2xl shadow-md p-5 py-8 border border-gray-100 min-h-[180px]">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-[#3347ff]">1</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('card1_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('card1_desc')}
                </p>
              </div>

              {/* Карточка 2 */}
              <div className="bg-white rounded-2xl shadow-md p-5 py-8 border border-gray-100 min-h-[180px]">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-[#3347ff]">2</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('card2_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('card2_desc')}
                </p>
              </div>

              {/* Карточка 3 */}
              <div className="bg-white rounded-2xl shadow-md p-5 py-8 border border-gray-100 min-h-[180px]">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-[#3347ff]">3</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('card3_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('card3_desc')}
                </p>
              </div>

              {/* Карточка 4 */}
              <div className="bg-white rounded-2xl shadow-md p-5 py-8 border border-gray-100 min-h-[180px]">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-[#3347ff]">4</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('card4_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('card4_desc')}
                </p>
              </div>
            </div>

                <div className="flex justify-center">
                  <Link href="/terminal" className="bg-[#4A4AFB] hover:bg-[#3d3de8] text-white px-10 py-4 rounded-xl font-bold transition-colors inline-block">
                    {t('start_trading')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
            {/* Left - заголовок, описание, навигация */}
            <div className="flex flex-col">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
                {t('education_title')}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-10 text-left max-w-xl">
                {t('education_desc')}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEducationSlide(0)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${educationSlide === 0 ? 'bg-[#3347ff] text-white' : 'bg-[#e8e8f2] text-gray-900 hover:bg-[#e0e0ec]'}`} aria-label={t('nav_prev')}>
                  <CaretLeft className="w-6 h-6" weight="bold" />
                </button>
                <button type="button" onClick={() => setEducationSlide(1)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${educationSlide === 1 ? 'bg-[#3347ff] text-white' : 'bg-[#e8e8f2] text-gray-900 hover:bg-[#e0e0ec]'}`} aria-label={t('nav_next')}>
                  <CaretRight className="w-6 h-6" weight="bold" />
                </button>
              </div>
            </div>

            {/* Right - слайдер карточек */}
            <div className="overflow-hidden">
              <div className="flex gap-6 transition-transform duration-500 ease-out" style={{ transform: `translateX(-${educationSlide * 50}%)` }}>
                <div className="flex-shrink-0 w-[calc(100%-1.5rem)] min-w-0 md:w-[calc(85%-0.75rem)]">
            {/* Card 1 - For Beginners */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-left h-full">
              <div className="mb-4">
                <svg className="w-8 h-8 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('card_beginner_title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {t('card_beginner_desc')}
              </p>
              <ul className="space-y-2 mb-5">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_beginner_item1')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_beginner_item2')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_beginner_item3')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_beginner_item4')}</span>
                </li>
              </ul>
              <Link href="/education" className="inline-flex items-center gap-1.5 text-[#3347ff] font-semibold text-sm hover:text-[#2a3ae6] transition-colors">
                {t('start_learning')}
                <CaretRight className="w-5 h-5" />
              </Link>
            </div>
                </div>
                <div className="flex-shrink-0 w-[calc(100%-1.5rem)] min-w-0 md:w-[calc(85%-0.75rem)]">
            {/* Card 2 - Expert Strategies */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-left h-full">
              <div className="mb-4">
                <svg className="w-8 h-8 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('card_expert_title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {t('card_expert_desc')}
              </p>
              <ul className="space-y-2 mb-5">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_expert_item1')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_expert_item2')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_expert_item3')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('card_expert_item4')}</span>
                </li>
              </ul>
              <Link href="/education" className="inline-flex items-center gap-1.5 text-[#3347ff] font-semibold text-sm hover:text-[#2a3ae6] transition-colors">
                {t('study_strategies')}
                <CaretRight className="w-5 h-5" />
              </Link>
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Видео-секция */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#3347ff]/5 via-[#3347ff]/10 to-[#3347ff]/5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z" fill="url(#waveGradientStart)" />
            <defs>
              <linearGradient id="waveGradientStart" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3347ff" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#4a5aff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3347ff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-12 md:mb-16">
            {t('video_title')}
          </h2>

          <div className="flex justify-center items-center">
            <div className="relative w-full max-w-3xl aspect-video bg-[#061230] rounded-2xl overflow-hidden flex items-center justify-center">
              <button className="w-20 h-20 md:w-24 md:h-24 bg-[#3347ff] rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-[#2a3ae6] transition-all hover:scale-110" aria-label={t('video_play_label')}>
                <svg className="w-10 h-10 md:w-12 md:h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <AuthSlidePanel open={showRegisterPanel} onClose={() => setShowRegisterPanel(false)} initialMode={panelMode} />

      <Footer />

      <ScrollToTop />
    </div>
  )
}
