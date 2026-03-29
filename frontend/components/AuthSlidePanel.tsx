'use client';

import { useState } from 'react';
import { Link } from '@/components/navigation';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { trackRefClick } from '@/lib/api/api';

const REF_COOKIE_NAME = 'ref_code';

function readRefCodeCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${REF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : undefined;
}

interface AuthSlidePanelProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthSlidePanel({ open, onClose, initialMode = 'register' }: AuthSlidePanelProps) {
  const ta = useTranslations('auth');
  const tc = useTranslations('common');
  const { login, register } = useAuthContext();
  const [panelMode, setPanelMode] = useState<'login' | 'register'>(initialMode);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${open ? 'bg-transparent' : 'bg-transparent pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#061230] shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        aria-hidden={!open}
      >
        <h2 id="panel-title" className="sr-only">{panelMode === 'login' ? ta('login_title') : ta('register_title')}</h2>
        <div className="relative pt-6 px-6 pb-0 border-b border-white/10">
          <button
            onClick={onClose}
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
              onClick={() => { setPanelMode('register'); setFormError(null); }}
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
              onClick={() => { setPanelMode('login'); setFormError(null); }}
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
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              setIsSubmitting(true);
              try {
                if (panelMode === 'register') {
                  trackRefClick();
                  const refCode = readRefCodeCookie();
                  const result = await register(email, password, refCode);
                  if (result.success) {
                    onClose();
                  } else {
                    setFormError(result.error ?? ta('register_error'));
                  }
                } else {
                  const result = await login(email, password);
                  if (result.success) {
                    onClose();
                  } else if (result.requires2FA) {
                    // 2FA handled separately if needed
                  } else {
                    setFormError(result.error ?? ta('login_error'));
                  }
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={panelMode === 'register' ? 'new-password' : 'current-password'}
                required
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
            {formError && (
              <p className="text-sm text-red-400 text-center">{formError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg btn-accent text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || (panelMode === 'register' && !agreeToTerms)}
            >
              {isSubmitting
                ? '...'
                : panelMode === 'login' ? tc('login') : ta('register_btn')}
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
  );
}
