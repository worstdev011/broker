'use client'

import Image from 'next/image'
import { Link } from '@/components/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'

export default function ReviewsPage() {
  const t = useTranslations('reviews')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    name: '',
    email: '',
    rating: 0,
    text: ''
  })
  const [hoveredRating, setHoveredRating] = useState(0)

  const reviews = [
    { id: 1, nameKey: 'review1_name', textKey: 'review1_text', dateKey: 'review1_date', rating: 5, verified: true },
    { id: 2, nameKey: 'review2_name', textKey: 'review2_text', dateKey: 'review2_date', rating: 5, verified: true },
    { id: 3, nameKey: 'review3_name', textKey: 'review3_text', dateKey: 'review3_date', rating: 4, verified: true },
    { id: 4, nameKey: 'review4_name', textKey: 'review4_text', dateKey: 'review4_date', rating: 5, verified: true },
    { id: 5, nameKey: 'review5_name', textKey: 'review5_text', dateKey: 'review5_date', rating: 5, verified: true },
    { id: 6, nameKey: 'review6_name', textKey: 'review6_text', dateKey: 'review6_date', rating: 4, verified: true },
    { id: 7, nameKey: 'review7_name', textKey: 'review7_text', dateKey: 'review7_date', rating: 5, verified: true },
    { id: 8, nameKey: 'review8_name', textKey: 'review8_text', dateKey: 'review8_date', rating: 5, verified: true }
  ]

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white [color-scheme:light]">
      <SiteHeader
        activeNav="reviews"
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

      {/* Reviews Section */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('section_title')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('section_desc')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {reviews.map((review) => {
              const name = t(review.nameKey)
              return (
              <div key={review.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3347ff] to-[#2a3ae6] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{name}</h3>
                        {review.verified && (
                          <svg className="w-4 h-4 text-[#3347ff]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{t(review.dateKey)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed">{t(review.textKey)}</p>
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* Review Form Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('form_title')}</h2>
            <p className="text-lg text-gray-600">
              {t('form_desc')}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 md:p-12">
            <form onSubmit={(e) => { e.preventDefault(); alert(t('thanks')); setReviewForm({ name: '', email: '', rating: 0, text: '' }); }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative group">
                  <input
                    type="text"
                    id="review-name"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                    placeholder=" "
                    required
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff] transition-all"
                  />
                  <label
                    htmlFor="review-name"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-600
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-600"
                  >
                    {t('label_name')}
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="email"
                    id="review-email"
                    value={reviewForm.email}
                    onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })}
                    placeholder=" "
                    required
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff] transition-all"
                  />
                  <label
                    htmlFor="review-email"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-600
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-600"
                  >
                    {t('label_email')}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('label_rating')}</label>
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => {
                    const starValue = i + 1
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: starValue })}
                        onMouseEnter={() => setHoveredRating(starValue)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 transition-colors ${
                            starValue <= (hoveredRating || reviewForm.rating)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
                {reviewForm.rating === 0 && (
                  <p className="text-sm text-red-500 mt-2">{t('rating_required')}</p>
                )}
              </div>
              <div>
                <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-3">
                  {t('label_review')}
                </label>
                <textarea
                  id="review-text"
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                  rows={6}
                  required
                  placeholder={t('placeholder_review')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff] transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={reviewForm.rating === 0}
                className="w-full py-3 rounded-lg btn-accent text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('submit')}
              </button>
            </form>
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
                  {tc('login')}
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
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0                       peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
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
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0                       peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
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
                        peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0                         peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
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
