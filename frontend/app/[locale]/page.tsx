'use client'

import Image from 'next/image'
import { Suspense, useState, useEffect, FormEvent, ReactNode, ChangeEvent } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/components/navigation'
import ReactCountryFlag from 'react-country-flag'
import { useAuth } from '@/lib/hooks/useAuth'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { INSTRUMENTS } from '@/lib/instruments'
import { toast } from '@/stores/toast.store'

/** Filled (solid) field icons for auth panel - not outline/stroke */
function IconMailFilled({ className }: { className?: string }) {
  return (
    <svg className={className} width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 1.99 2H20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5.01L4 8V6l8 5 8-5v2z" />
    </svg>
  )
}

function IconEyeFilled({ className }: { className?: string }) {
  return (
    <svg className={className} width={17} height={17} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
    </svg>
  )
}

function IconEyeSlashFilled({ className }: { className?: string }) {
  return (
    <svg className={className} width={17} height={17} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z" />
      <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.473.684L7.846 5.082a1.5 1.5 0 0 1 1.415 1.415l2.13 2.837zm4.473-3.237L16 6.086l.696 1.121a1.5 1.5 0 0 1-.972 2.292V12.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.282l-1.086-1.086A7.002 7.002 0 0 1 8 15c-5 0-8-5.5-8-5.5a7 7 0 0 1 1.043-1.31L.818 2.818a.5.5 0 0 1 0-.707l.708-.708a.5.5 0 0 1 .707 0L15.293 14.293a.5.5 0 0 1 0 .707l-.707.708a.5.5 0 0 1-.707 0l-1.889-1.89z" />
    </svg>
  )
}

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

interface FloatInputProps {
  id: string
  type?: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  label: ReactNode
  required?: boolean
  minLength?: number
  disabled?: boolean
  icon?: 'email' | 'password'
}

function FloatInput({ id, type = 'text', value, onChange, label, required, minLength, disabled, icon }: FloatInputProps) {
  const [focused, setFocused] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const isFloated = focused || value !== ''
  const resolvedType = type === 'password' ? (showPwd ? 'text' : 'password') : type

  return (
    <div className="relative" style={{ paddingTop: '14px' }}>
      <input
        id={id}
        type={resolvedType}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        disabled={disabled}
        placeholder=""
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ borderColor: focused ? 'transparent' : 'rgba(255,255,255,0.2)' }}
        className={`w-full bg-transparent border-0 border-b pb-2 pt-0.5 text-[15px] text-white outline-none transition-colors disabled:opacity-50 ${icon ? 'pr-8' : ''}`}
      />

      {/* Base underline - always visible, fades when focused */}

      {/* Animated focus underline growing from center */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '2px',
          background: '#2478ff',
          transform: focused ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'center',
          transition: 'transform 200ms ease',
          boxShadow: focused ? '0 2px 8px rgba(36,120,255,0.25)' : 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        style={{
          position: 'absolute',
          left: 0,
          top: isFloated ? '0px' : '58%',
          transform: isFloated ? 'none' : 'translateY(-50%)',
          fontSize: isFloated ? '11px' : '15px',
          fontWeight: isFloated ? 500 : 400,
          color: isFloated ? '#2478ff' : 'rgba(255,255,255,0.4)',
          transition: 'all 180ms ease',
          pointerEvents: 'none',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </label>

      {/* Email - filled envelope */}
      {icon === 'email' && (
        <span className="absolute right-0 bottom-2 pointer-events-none text-white/25">
          <IconMailFilled />
        </span>
      )}

      {/* Password - filled eye toggle */}
      {icon === 'password' && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPwd(v => !v)}
          className={`absolute right-0 bottom-2 transition-colors ${focused ? 'text-white/50' : 'text-white/25'}`}
          aria-label={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {showPwd ? <IconEyeSlashFilled /> : <IconEyeFilled />}
        </button>
      )}
    </div>
  )
}

function HomeContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading, login, register, verify2FA } = useAuth()
  const t = useTranslations('home')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')
  
  const [heroReady, setHeroReady] = useState(false)
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
  const [errorVisible, setErrorVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [loginAwaiting2FA, setLoginAwaiting2FA] = useState(false)
  const [loginTempToken, setLoginTempToken] = useState<string | null>(null)
  const [twoFACode, setTwoFACode] = useState('')

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!error) { setErrorVisible(false); return }
    setErrorVisible(true)
    const t1 = setTimeout(() => setErrorVisible(false), 4500)
    const t2 = setTimeout(() => setError(''), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [error])


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

  useEffect(() => {
    const err = searchParams.get('error')
    if (err?.startsWith('google_')) {
      const messages: Record<string, string> = {
        google_denied: ta('google_error_denied'),
        google_invalid_state: ta('google_error_invalid_state'),
        google_invalid_callback: ta('google_error_invalid_callback'),
        google_token_failed: ta('google_error_token_failed'),
        google_no_id_token: ta('google_error_no_id_token'),
        google_bad_token: ta('google_error_bad_token'),
        google_no_email: ta('google_error_no_email'),
        google_not_configured: ta('google_error_not_configured'),
        google_login_failed: ta('google_error_login_failed'),
      }
      toast(messages[err] ?? ta('google_error_generic'), 'error')
      router.replace(pathname || '/')
      return
    }

    if (searchParams.get('google2fa') === '1') {
      const tempToken = searchParams.get('tempToken')
      if (tempToken) {
        setShowRegisterPanel(true)
        setPanelMode('login')
        setLoginAwaiting2FA(true)
        setLoginTempToken(tempToken)
        setTwoFACode('')
        setError('')
        router.replace(pathname || '/')
      }
    }
  }, [searchParams, router, pathname, ta])

  useEffect(() => {
    if (!showRegisterPanel) {
      setLoginAwaiting2FA(false)
      setLoginTempToken(null)
      setTwoFACode('')
    }
  }, [showRegisterPanel])

  useEffect(() => {
    if (panelMode === 'register') {
      setLoginAwaiting2FA(false)
      setLoginTempToken(null)
      setTwoFACode('')
    }
  }, [panelMode])

  useEffect(() => {
    if (!showRegisterPanel) return
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const header = document.querySelector('header') as HTMLElement | null
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = scrollbarWidth + 'px'
    if (header) header.style.paddingRight = scrollbarWidth + 'px'
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      if (header) header.style.paddingRight = ''
    }
  }, [showRegisterPanel])

  const resetLogin2FAStep = () => {
    setLoginAwaiting2FA(false)
    setLoginTempToken(null)
    setTwoFACode('')
    setError('')
  }

  const handleGoogleLogin = () => {
    const prefix = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    window.location.href = prefix ? `${prefix}/api/auth/google` : '/api/auth/google'
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (panelMode === 'login' && loginAwaiting2FA && loginTempToken) {
      if (!/^\d{6}$/.test(twoFACode)) {
        setError(ta('twofa_code_invalid'))
        return
      }
      setIsSubmitting(true)
      const v = await verify2FA(loginTempToken, twoFACode)
      if (v.success) {
        resetLogin2FAStep()
        setShowRegisterPanel(false)
        router.push('/terminal')
      } else {
        setError(v.error || ta('login_error'))
      }
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)

    if (panelMode === 'register') {
      if (password !== confirmPassword) {
        setError(ta('passwords_mismatch'))
        setIsSubmitting(false)
        return
      }
      if (password.length < 6) {
        setError(ta('password_too_short'))
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
        // Если email уже занят - переключаем на вкладку входа
        if (result.error?.includes(ta('email_already_registered'))) setPanelMode('login')
      }
    } else {
      const result = await login(email, password)
      if (result.success) {
        setShowRegisterPanel(false)
        router.push('/terminal')
      } else if ('requires2FA' in result && result.requires2FA && result.tempToken) {
        setLoginAwaiting2FA(true)
        setLoginTempToken(result.tempToken)
        setTwoFACode('')
        setError('')
      } else {
        setError(result.error || ta('login_error'))
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header and Hero Section */}
      <div className="flex flex-col bg-[#061230] relative overflow-hidden pt-16 sm:pt-20 md:pt-24">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/back1.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/back2.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        
        <SiteHeader
          onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
          onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
        />

        <div className="flex flex-col">
        {/* Hero Section */}
        <section className="flex flex-col justify-center min-h-[calc(100dvh-4rem)] sm:min-h-[54vh] md:min-h-[58vh] py-16 sm:py-24 md:py-32 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-[1fr_1.25fr] gap-12 items-center">
              {/* Left Column - Text Content */}
              <div className="space-y-8 text-center md:text-left">
                {/* DOVI rating badge */}
                <a
                  href="https://dovi.com.ua/company/comfortrade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 w-fit mx-auto md:mx-0 transition-all hover:brightness-110 group"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    opacity: heroReady ? 1 : 0,
                    transform: heroReady ? 'none' : 'translateY(20px)',
                    transition: 'opacity 0.6s ease 0ms, transform 0.6s ease 0ms',
                  }}
                >
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4].map(i => (
                      <svg key={i} className="text-amber-400" style={{width:'14px',height:'14px'}} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <svg style={{width:'14px',height:'14px'}} viewBox="0 0 20 20">
                      <defs>
                        <linearGradient id="star-partial" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="60%" stopColor="#fbbf24" />
                          <stop offset="60%" stopColor="rgba(255,255,255,0.1)" />
                        </linearGradient>
                      </defs>
                      <path fill="url(#star-partial)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="text-white font-bold text-xs">4.6</span>
                  <span className="w-px h-3 bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
                      <Image src="/images/dovilogo.ico" alt="DOVI" width={16} height={16} className="w-3.5 h-3.5 object-contain" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-white/90 text-[11px] font-semibold">DOVI.COM.UA</span>
                      <span className="text-white/50 text-[9px] font-medium mt-0.5">{t('hero_dovi_reviews_count')}</span>
                    </div>
                  </div>
                </a>

                <h1
                  className="text-[2.5rem] md:text-5xl lg:text-6xl font-bold text-white leading-tight"
                  style={{
                    opacity: heroReady ? 1 : 0,
                    transform: heroReady ? 'none' : 'translateY(28px)',
                    transition: 'opacity 0.7s ease 120ms, transform 0.7s ease 120ms',
                  }}
                >
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

                <p
                  className="text-base text-gray-300 leading-relaxed max-w-sm sm:max-w-md md:max-w-lg mx-auto md:mx-0 font-extralight"
                  style={{
                    opacity: heroReady ? 1 : 0,
                    transform: heroReady ? 'none' : 'translateY(24px)',
                    transition: 'opacity 0.7s ease 260ms, transform 0.7s ease 260ms',
                  }}
                >
                  {t('hero_subtitle')}
                </p>
                
                <div
                  className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
                  style={{
                    opacity: heroReady ? 1 : 0,
                    transform: heroReady ? 'none' : 'translateY(20px)',
                    transition: 'opacity 0.7s ease 400ms, transform 0.7s ease 400ms',
                  }}
                >
                  <button onClick={() => setShowRegisterPanel(true)} className="btn-accent text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition-colors w-fit min-w-[240px] sm:min-w-0 mx-auto sm:mx-0">
                    {tc('create_account')}
                  </button>
                  <button onClick={() => setShowRegisterPanel(true)} className="bg-transparent text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-lg font-semibold text-sm sm:text-base border border-white/50 hover:bg-white/10 transition-colors w-fit min-w-[240px] sm:min-w-0 mx-auto sm:mx-0">
                    {tc('open_demo')}
                  </button>
                </div>
              </div>

              {/* Right Column - Phone Image (hidden on mobile); column wider so image can scale up */}
              <div
                className="hidden md:flex items-center justify-end min-w-0"
                style={{
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? 'none' : 'translateX(48px) scale(0.97)',
                  transition: 'opacity 0.9s ease 200ms, transform 0.9s ease 200ms',
                }}
              >
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
              <div className="hidden md:flex flex-1 items-stretch px-0">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                {[
                  [t('platform_card1_line1'), t('platform_card1_line2'), t('platform_card1_line3'), false],
                  [t('platform_card2_line1'), t('platform_card2_line2'), t('platform_card2_line3'), false],
                  [t('platform_card3_line1'), t('platform_card3_line2'), t('platform_card3_line3'), true],
                ].map(([l1, l2, l3, center], idx) => (
                  <div key={idx} className={`relative bg-white rounded-2xl shadow-md pt-10 pb-5 px-4 md:pt-10 md:pb-6 md:px-6 flex flex-col items-start gap-2 text-left${center ? ' col-span-2 md:col-span-1 w-[calc(50%-8px)] md:w-auto mx-auto md:mx-0' : ''}`}>
                    <div className="absolute -top-1.5 left-4 md:left-5 w-7 h-8 bg-[#ebedff] flex items-center justify-center shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}>
                      <svg className="w-3 h-3 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-gray-900 font-bold text-sm md:text-base leading-snug">
                      <div>{l1}</div>
                      <div>{l2}</div>
                      <div>{l3}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Квадрат с фоном как в хиро: картинки + цвет, лого слева сверху, телефон по центру */}
            <div className="hidden md:flex relative items-center justify-center py-8">
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
          <div className="bg-[#061230] relative overflow-hidden rounded-2xl py-16 md:py-24 px-6 md:px-10 lg:px-14 flex justify-center">
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
              <span className="text-[#3347ff] text-base">07 - 08</span>
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
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showRegisterPanel ? 'bg-[#010617]/70 backdrop-blur-[2px]' : 'bg-transparent pointer-events-none'}`}
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
          className={`fixed inset-x-0 bottom-0 top-auto h-[92dvh] max-h-[92dvh] w-full bg-[#0a1835] backdrop-blur-xl shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out rounded-t-2xl border border-white/10 md:rounded-none md:border-white/5 md:border-t-0 md:border-r-0 md:border-b-0 md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:max-w-[380px] ${showRegisterPanel ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full pointer-events-none'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          aria-hidden={!showRegisterPanel}
        >
            <h2 id="panel-title" className="sr-only">{showForgotPassword ? ta('restore_password') : panelMode === 'login' ? ta('login_title') : ta('register_title')}</h2>
            {/* Error toast */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                padding: '0 16px',
                transform: errorVisible ? 'translateY(0)' : 'translateY(-110%)',
                opacity: errorVisible ? 1 : 0,
                transition: 'transform 280ms cubic-bezier(0.34,1.2,0.64,1), opacity 280ms ease',
                pointerEvents: errorVisible ? 'auto' : 'none',
              }}
            >
              <div
                className="rounded-b-xl px-4 py-3 text-[13px] leading-[1.5] text-white font-semibold flex items-center justify-between gap-3"
                style={{ background: 'rgba(220,38,38,0.55)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(220,38,38,0.2)' }}
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => { setErrorVisible(false); setTimeout(() => setError(''), 300) }}
                  className="shrink-0 text-white/70 hover:text-white transition-colors"
                  aria-label="Закрыть"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="relative px-6 sm:px-6 pt-4 pb-3.5">
              {showForgotPassword ? (
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} className="pb-2">
                  <span className="text-[15px] font-semibold text-white">{ta('restore_password')}</span>
                </div>
              ) : (
              <div className="relative flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                  style={{
                    color: panelMode === 'register' ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontWeight: panelMode === 'register' ? 600 : 400,
                    transition: 'color 150ms ease, font-weight 150ms ease',
                  }}
                  className="flex-1 h-9 text-[15px] bg-transparent border-0 outline-none cursor-pointer pb-1.5"
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
                  style={{
                    color: panelMode === 'login' ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontWeight: panelMode === 'login' ? 600 : 400,
                    transition: 'color 150ms ease, font-weight 150ms ease',
                  }}
                  className="flex-1 h-9 text-[15px] bg-transparent border-0 outline-none cursor-pointer pb-1.5"
                >
                  {ta('login_title')}
                </button>
                {/* Sliding indicator */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    width: '50%',
                    height: '2px',
                    borderRadius: '2px',
                    background: '#2478ff',
                    transform: panelMode === 'login' ? 'translateX(100%)' : 'translateX(0)',
                    transition: 'transform 200ms ease',
                  }}
                />
              </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 sm:px-6 pb-4 sm:pb-5">
              {showForgotPassword ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-gray-400 mb-3">
                      {ta('restore_password_desc')}
                    </p>
                    <FloatInput
                      id="forgot-email"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      label={tc('email')}
                      icon="email"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!forgotPasswordEmail) {
                          setError(ta('enter_email_error'));
                          return;
                        }
                        setError('');
                        // STUB: вызвать API восстановления пароля когда будет готов эндпоинт
                        toast(ta('restore_alert'), 'info');
                      }}
                      className="w-full mt-3 py-2.5 rounded-xl btn-accent text-white font-semibold active:scale-[0.99] transition-all shadow-lg shadow-[#3347ff]/20"
                    >
                      {ta('restore_btn')}
                    </button>
                  </div>
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
                </div>
              ) : (
              <form className="space-y-4" onSubmit={handleFormSubmit}>
                {panelMode === 'login' && loginAwaiting2FA ? (
                  <>
                    <div className="space-y-2 pb-1">
                      <h3 className="text-base font-semibold text-white">{ta('twofa_title')}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">{ta('twofa_desc')}</p>
                    </div>
                    <p className="text-sm text-gray-300 truncate border-b border-white/10 pb-2" title={email}>
                      {email}
                    </p>
                    <div className="pt-1">
                      <input
                        id="panel-2fa-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        disabled={isSubmitting}
                        aria-label={ta('twofa_title')}
                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-center text-xl tracking-[0.35em] font-mono placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={resetLogin2FAStep}
                      disabled={isSubmitting}
                      className="w-full py-2 rounded-xl border border-white/15 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      {ta('twofa_back')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || twoFACode.length !== 6}
                      className="w-full py-2 rounded-xl btn-accent text-white font-semibold active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#3347ff]/20"
                    >
                      {isSubmitting ? ta('twofa_verifying') : ta('twofa_submit')}
                    </button>
                  </>
                ) : (
                  <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-medium hover:bg-white/12 transition-colors"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {tc('continue_with_google')}
                </button>
                <div className="relative py-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2.5 bg-[#0a1835] text-xs text-gray-500">{tc('or')}</span>
                  </div>
                </div>
                <FloatInput
                  id="panel-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label={tc('email')}
                  required
                  disabled={isSubmitting}
                  icon="email"
                />
                <div>
                  <FloatInput
                    id="panel-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    label={tc('password')}
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    icon="password"
                  />
                  {panelMode === 'register' && (
                    <p className="mt-1 text-[11px] leading-[1.2] text-gray-500">{ta('password_hint')}</p>
                  )}
                </div>
                {panelMode === 'register' && (
                  <FloatInput
                    id="panel-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    label={tc('confirm_password')}
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    icon="password"
                  />
                )}
                {panelMode === 'login' && (
                  <div className="flex justify-end -mt-0.5">
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
                  <FloatInput
                    id="panel-promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    label={<>{tc('promo_code')} <span className="opacity-60">({tc('optional')})</span></>}
                    disabled={isSubmitting}
                  />
                )}
                {panelMode === 'register' && (
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-0.5 w-4 h-4 rounded border-white/30 bg-white/5 text-[#3347ff] focus:ring-[#3347ff]/50 focus:ring-offset-0 disabled:opacity-50 cursor-pointer"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                      {ta('agree_with')} <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('terms_link')}</Link> {ta('agree_and')} <Link href="/policy/privacy" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('privacy_link')}</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-xl btn-accent text-white font-semibold active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#3347ff]/20"
                >
                  {isSubmitting 
                    ? (panelMode === 'login' ? ta('logging_in') : ta('registering')) 
                    : (panelMode === 'login' ? tc('login') : ta('register_btn'))
                  }
                </button>
                  </>
                )}
              </form>
              )}
            </div>
            {panelMode === 'register' ? (
              <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0a1835]/80">
                <p className="text-xs text-center text-gray-500 leading-relaxed font-medium">
                  {ta('data_protection')} <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('policy_link')}</Link> {ta('agree_and')} <Link href="/policy/aml-kyc" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">{ta('aml_link')}</Link>.
                </p>
              </div>
            ) : (
              <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0a1835]/80">
                <div>
                  <p className="text-xs text-center text-gray-500 mb-2 font-medium">{ta('follow_socials')}</p>
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
