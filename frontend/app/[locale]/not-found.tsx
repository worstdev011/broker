'use client'

import { Link } from '@/components/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'

export default function NotFound() {
  const t = useTranslations('notFound')
  const tc = useTranslations('common')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('login')
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader
        onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
        onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
      />

      {/* 404 Content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#f7f7fc] to-white pt-24">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-9xl md:text-[12rem] font-bold text-[#3347ff] mb-4 leading-none">
                404
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-[#3347ff] to-[#2a3ae6] mx-auto mb-8"></div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('title')}
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              {t('desc')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="px-8 py-3 rounded-lg btn-accent text-white font-semibold transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {t('back_home')}
              </Link>
              <button
                onClick={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
                className="px-8 py-3 rounded-lg bg-white border-2 border-[#3347ff] text-[#3347ff] font-semibold hover:bg-[#3347ff]/5 transition-colors"
              >
                {tc('login')}
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">{t('popular_pages')}</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/start" className="text-[#3347ff] hover:text-[#2a3ae6] transition-colors text-sm font-medium">
                  {t('link_start')}
                </Link>
                <span className="text-gray-300">•</span>
                <Link href="/about" className="text-[#3347ff] hover:text-[#2a3ae6] transition-colors text-sm font-medium">
                  {t('link_about')}
                </Link>
                <span className="text-gray-300">•</span>
                <Link href="/education" className="text-[#3347ff] hover:text-[#2a3ae6] transition-colors text-sm font-medium">
                  {t('link_education')}
                </Link>
                <span className="text-gray-300">•</span>
                <Link href="/reviews" className="text-[#3347ff] hover:text-[#2a3ae6] transition-colors text-sm font-medium">
                  {t('link_reviews')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthSlidePanel open={showRegisterPanel} onClose={() => setShowRegisterPanel(false)} initialMode={panelMode} />

      {/* Footer */}
      <footer className="bg-[#061230] text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            {tc('all_rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}
