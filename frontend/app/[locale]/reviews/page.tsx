'use client'

import Image from 'next/image'
import { Link } from '@/components/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function ReviewsPage() {
  const t = useTranslations('reviews')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
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

      <AuthSlidePanel open={showRegisterPanel} onClose={() => setShowRegisterPanel(false)} initialMode={panelMode} />

      <Footer />

      <ScrollToTop />
    </div>
  )
}
