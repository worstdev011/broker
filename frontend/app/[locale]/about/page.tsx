'use client'

import Image from 'next/image'
import { Link } from '@/components/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'

export default function AboutPage() {
  const t = useTranslations('about')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')
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
        activeNav="about"
        onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
        onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
      />

      {/* Hero */}
      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-6 md:px-8 relative z-10 pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label={t('breadcrumb_aria')}>
                <Link href="/" className="hover:text-white transition-colors">{t('breadcrumb_home')}</Link>
                <span className="text-gray-500">→</span>
                <span className="text-white">{t('breadcrumb_about')}</span>
              </nav>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">{t('title')}</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex-shrink-0 w-[5.5rem] h-[5.5rem] md:w-[6.5rem] md:h-[6.5rem] rounded-2xl bg-[#ebedff] flex items-center justify-center overflow-hidden">
              <Image src="/images/about.png" alt="" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Mission block — фон aboutmain, текст и ноутбук поверх */}
      <section className="relative py-16 md:py-24 overflow-x-hidden min-h-[600px] md:min-h-[700px]">
        <div className="absolute inset-0">
          <Image
            src="/images/aboutmain.png"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center">
          <div className="max-w-4xl md:max-w-5xl mx-auto text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {t('mission_title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl md:max-w-4xl mx-auto leading-relaxed">
              {t('mission_desc')}
            </p>
          </div>
          <div className="w-full max-w-5xl flex justify-center">
            <Image
              src="/images/aboutmockup.png"
              alt={t('terminal_alt')}
              width={900}
              height={600}
              className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Accomplishments / Stats */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight max-w-xl">
              {t('accomplishments_title_line1')}
              <br />
              {t('accomplishments_title_line2')}
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-md lg:pt-1">
              {t('accomplishments_desc')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8 flex flex-col items-center text-center">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                100K<span className="text-[#3347ff]">+</span>
              </p>
              <p className="text-[#3347ff] font-semibold mb-3">{t('stats1_label')}</p>
              <p className="text-sm text-gray-600">
                {t('stats1_desc')}
              </p>
            </div>
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8 flex flex-col items-center text-center">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                40<span className="text-[#3347ff]">+</span>
              </p>
              <p className="text-[#3347ff] font-semibold mb-3">{t('stats2_label')}</p>
              <p className="text-sm text-gray-600">
                {t('stats2_desc')}
              </p>
            </div>
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8 flex flex-col items-center text-center">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                89<span className="text-[#3347ff]">%</span>
              </p>
              <p className="text-[#3347ff] font-semibold mb-3">{t('stats3_label')}</p>
              <p className="text-sm text-gray-600">
                {t('stats3_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story and Mission Block */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/images/office.jpeg"
                  alt={t('office_alt')}
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>

            {/* Right Column - Text Content */}
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {t('story_title')}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {t('story_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Block */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-stretch">
            {/* Left Column - Тёмный блок с текстом */}
            <div className="relative rounded-2xl bg-[#0D1225] p-8 md:p-10 overflow-hidden flex flex-col">
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <Image src="/images/frame.png" alt="" fill className="object-cover opacity-80" />
              </div>
              <div className="relative z-10 flex flex-col flex-1 min-h-0">
                <div className="flex-1 space-y-6">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                    {t('values_title_line1')}
                    <br />
                    {t('values_title_line2')}
                    <br />
                    {t('values_title_line3')}
                  </h2>
                  <p className="text-lg text-[#BEC0CB] leading-relaxed max-w-md">
                    {t('values_desc')}
                  </p>
                </div>
                <Link href="/reviews" className="inline-block self-start mt-auto pt-6 bg-[#475DFB] hover:bg-[#3d52e8] text-white px-8 py-4 rounded-xl font-medium transition-colors shadow-lg">
                  {t('read_reviews')}
                </Link>
              </div>
            </div>

            {/* Right Column - Cards Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Card 1 - Прозрачность */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <div className="w-16 h-16 bg-[#3347ff]/10 rounded-xl flex items-center justify-center mb-4">
                <Image
                  src="/images/1.svg"
                  alt={t('value1_title')}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('value1_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('value1_desc')}
                </p>
              </div>

              {/* Card 2 - Надёжность */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <div className="w-16 h-16 bg-[#3347ff]/10 rounded-xl flex items-center justify-center mb-4">
                <Image
                  src="/images/2.svg"
                  alt={t('value2_title')}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('value2_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('value2_desc')}
                </p>
              </div>

              {/* Card 3 - Удобство */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <div className="w-16 h-16 bg-[#3347ff]/10 rounded-xl flex items-center justify-center mb-4">
                <Image
                  src="/images/3.svg"
                  alt={t('value3_title')}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('value3_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('value3_desc')}
                </p>
              </div>

              {/* Card 4 - Поддержка */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <div className="w-16 h-16 bg-[#3347ff]/10 rounded-xl flex items-center justify-center mb-4">
                <Image
                  src="/images/4.svg"
                  alt={t('value4_title')}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('value4_title')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t('value4_desc')}
                </p>
              </div>
            </div>
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
            <h2 id="panel-title" className="sr-only">{panelMode === 'login' ? ta('login_title') : ta('register_title')}</h2>
            <div className="relative pt-6 px-6 pb-0 border-b border-white/10">
              <button
                onClick={() => setShowRegisterPanel(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors z-10"
                aria-label={tc('close')}
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
                  {ta('register_title')}
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
                  {ta('login_title')}
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
                  {tc('continue_with_google')}
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#061230] text-gray-400">{tc('or')}</span>
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
                    {tc('email')}
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
                    {tc('password')}
                  </label>
                </div>
                {panelMode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button type="button" className="text-sm text-[#3347ff] hover:text-[#2a3ae6] transition-colors">
                      {ta('forgot_password')}
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
                      {tc('promo_code')} <span className="text-gray-500/80">({tc('optional')})</span>
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
                      {ta('agree_with')} <Link href="/policy/terms" className="text-[#3347ff] hover:underline">{ta('terms_link')}</Link> {ta('agree_and')} <Link href="/policy/privacy" className="text-[#3347ff] hover:underline">{ta('privacy_link')}</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg btn-accent text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={panelMode === 'register' && !agreeToTerms}
                >
                  {panelMode === 'login' ? tc('login') : ta('register_btn')}
                </button>
              </form>
            </div>
            {panelMode === 'register' && (
              <div className="p-6 border-t border-white/10 bg-[#061230]">
                <p className="text-xs text-center text-gray-500 leading-relaxed">
                  {ta('data_protection')} <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('policy_link')}</Link> {ta('agree_and')} <Link href="/policy/aml-kyc" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('aml_link')}</Link>.
                </p>
              </div>
            )}
          </div>
      </>

      {/* Social Media Section */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('social_title')}
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {t('social_desc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <a
                href="https://www.instagram.com/comfortrade/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-[#E4405F] hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCAF45] transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

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
