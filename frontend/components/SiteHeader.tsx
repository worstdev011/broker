'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter, usePathname } from '@/components/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { LANGUAGES } from '@/lib/languages'
import type { Locale } from '@/i18n/routing'

type ActiveNav = 'start' | 'assets' | 'about' | 'reviews' | 'education'

interface SiteHeaderProps {
  activeNav?: ActiveNav
  onOpenLogin?: () => void
  onOpenRegister?: () => void
}

export function SiteHeader({ activeNav, onOpenLogin, onOpenRegister }: SiteHeaderProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common')
  const tn = useTranslations('nav')

  const languages = LANGUAGES

  // Map locale code (ru, en, ua) to LANGUAGES code (RU, EN, UA)
  const currentLanguageCode = locale.toUpperCase()

  useEffect(() => {
    const onScroll = () => setIsHeaderScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [showMobileMenu])

  const handleLanguageSwitch = (langCode: string) => {
    const newLocale = langCode.toLowerCase() as Locale
    router.replace(pathname, { locale: newLocale })
    setShowLanguageMenu(false)
    setShowMobileMenu(false)
  }

  const navLink = (href: string, label: string, key: ActiveNav) => {
    const isActive = activeNav === key
    return (
      <Link
        href={href}
        className={isActive ? 'text-white font-medium' : 'text-gray-300 hover:text-white transition-colors'}
      >
        {label}
      </Link>
    )
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        isHeaderScrolled ? 'bg-[#061230]/95 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 flex items-center justify-between">
        <div className="flex-1 flex justify-start md:hidden min-w-0">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Menu"
          >
            {showMobileMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex-1 flex justify-center md:flex-initial md:justify-start min-w-0">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Comfortrade" width={40} height={40} className="h-8 sm:h-10 w-auto object-contain" />
            <span className="hidden md:inline text-xl font-semibold text-white uppercase">Comfortrade</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLink('/start', tn('how_to_start'), 'start')}
          {navLink('/assets', tn('assets'), 'assets')}
          {navLink('/about', tn('about'), 'about')}
          {navLink('/reviews', tn('reviews'), 'reviews')}
          {navLink('/education', tn('education'), 'education')}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end md:flex-initial min-w-0">
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="text-white hover:text-gray-300 transition-colors flex items-center gap-2 px-2 py-1"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden relative">
                <Image
                  src={languages.find(l => l.code === currentLanguageCode)?.flag || '/images/flags/ru.svg'}
                  alt={currentLanguageCode}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="uppercase font-medium">{currentLanguageCode}</span>
              <svg className={`w-4 h-4 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLanguageMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl py-2 w-[320px] max-h-[70vh] overflow-y-auto scrollbar-dropdown-light z-50">
                  <div className="grid grid-cols-3 gap-1 p-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSwitch(lang.code)}
                        className={`text-center px-2 py-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1.5 ${
                          currentLanguageCode === lang.code ? 'bg-[#3347ff]/10 text-[#3347ff]' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden relative flex-shrink-0">
                          <Image src={lang.flag} alt={lang.code} fill className="object-cover" />
                        </div>
                        <span className="text-xs truncate w-full">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {!isLoading && (
            <>
              {isAuthenticated && user ? (
                <>
                  <span className="hidden md:inline text-white text-sm truncate max-w-[100px] lg:max-w-[140px]">{user.email}</span>
                  <button
                    onClick={() => logout()}
                    className="bg-transparent text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base border border-white/50 hover:bg-white/10 transition-colors"
                  >
                    {t('logout')}
                  </button>
                  <Link
                    href="/terminal"
                    className="btn-accent text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors flex items-center justify-center"
                  >
                    {t('terminal')}
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onOpenLogin?.()}
                    className="bg-transparent text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base border border-white/50 hover:bg-white/10 transition-colors"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={() => onOpenRegister?.()}
                    className="hidden md:inline-flex btn-accent text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base transition-colors items-center justify-center"
                  >
                    {t('register')}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => { setShowMobileMenu(false); setShowLanguageMenu(false); }} aria-hidden />
          <div className="absolute top-full left-0 right-0 z-50 md:hidden bg-[#061230] border-t border-white/10 shadow-xl">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              <Link href="/start" onClick={() => { setShowMobileMenu(false); setShowLanguageMenu(false); }} className="py-3 text-gray-300 hover:text-white border-b border-white/5">{tn('how_to_start')}</Link>
              <Link href="/assets" onClick={() => { setShowMobileMenu(false); setShowLanguageMenu(false); }} className="py-3 text-gray-300 hover:text-white border-b border-white/5">{tn('assets')}</Link>
              <Link href="/about" onClick={() => { setShowMobileMenu(false); setShowLanguageMenu(false); }} className="py-3 text-gray-300 hover:text-white border-b border-white/5">{tn('about')}</Link>
              <Link href="/reviews" onClick={() => { setShowMobileMenu(false); setShowLanguageMenu(false); }} className="py-3 text-gray-300 hover:text-white border-b border-white/5">{tn('reviews')}</Link>
              <Link href="/education" onClick={() => { setShowMobileMenu(false); setShowLanguageMenu(false); }} className="py-3 text-gray-300 hover:text-white border-b border-white/5">{tn('education')}</Link>
              <div className="pt-3 mt-2 border-t border-white/10">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center gap-2 py-2 text-gray-300 hover:text-white w-full"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image src={languages.find(l => l.code === currentLanguageCode)?.flag || '/images/flags/ru.svg'} alt="" fill className="object-cover" />
                  </div>
                  <span>{tn('language')}: {languages.find(l => l.code === currentLanguageCode)?.label || currentLanguageCode}</span>
                  <svg className={`w-4 h-4 ml-auto transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLanguageMenu && (
                  <div className="grid grid-cols-3 gap-2 py-2 pl-7">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSwitch(lang.code)}
                        className={`text-center py-2 rounded-lg text-sm flex flex-col items-center gap-1.5 ${currentLanguageCode === lang.code ? 'text-[#7b8fff]' : 'text-gray-400 hover:text-white'}`}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden relative flex-shrink-0">
                          <Image src={lang.flag} alt="" fill className="object-cover" />
                        </div>
                        <span className="text-xs truncate w-full">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
