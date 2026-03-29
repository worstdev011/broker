'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLandingAuth } from './LandingAuthContext';
import { partnersApi, ApiError } from '@/lib/api/partners-api';
import { usePartnersAuth } from '@/components/providers/PartnersAuthProvider';

export function LandingAuthModal() {
  const { isOpen, close, mode, open } = useLandingAuth();
  const { refreshPartner } = usePartnersAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/switches mode
  useEffect(() => {
    setError(null);
    setEmail('');
    setPassword('');
    setFirstName('');
    setTelegram('');
  }, [isOpen, mode]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await partnersApi.login(email, password);
      } else {
        await partnersApi.register({
          email,
          password,
          firstName: firstName || undefined,
          telegramHandle: telegram || undefined,
        });
      }
      await refreshPartner();
      close();
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError('Неверный email или пароль');
        else if (err.status === 403) setError('Аккаунт заблокирован');
        else if (err.status === 409) setError('Email уже зарегистрирован');
        else if (err.status === 400) setError('Проверьте правильность данных');
        else setError('Ошибка сервера. Попробуйте позже.');
      } else {
        setError('Ошибка соединения');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={close}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-lime/15 bg-[#0D120B] shadow-[0_0_80px_rgba(197,255,71,0.08)]">

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition text-xl"
        >
          ×
        </button>

        <div className="p-8">
          {/* Logo mark */}
          <div className="flex items-center gap-2 mb-7">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#C5FF47" fillOpacity="0.12"/>
              <path d="M16.5 4L9 15.5H14L11.5 24L20 12.5H15L16.5 4Z" fill="#C5FF47" stroke="#C5FF47" strokeWidth="0.5" strokeLinejoin="round"/>
            </svg>
            <span className="font-display font-bold text-sm tracking-[0.2em] uppercase text-white/60">
              Partners
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 mb-7">
            {(['register', 'login'] as const).map((m) => (
              <button
                key={m}
                onClick={() => open(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  mode === m
                    ? 'bg-lime text-[#080C0A] shadow-[0_0_20px_rgba(197,255,71,0.2)]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'register' ? 'РЕГИСТРАЦИЯ' : 'ВОЙТИ'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Имя (необяз.)"
                  className="col-span-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-lime/40 focus:bg-white/[0.06] transition"
                />
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="Telegram (необяз.)"
                  className="col-span-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-lime/40 focus:bg-white/[0.06] transition"
                />
              </div>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              autoComplete="email"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-lime/40 focus:bg-white/[0.06] transition"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Пароль"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-lime/40 focus:bg-white/[0.06] transition"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-lime hover:bg-lime-hover text-[#080C0A] font-bold text-sm tracking-widest transition-all shadow-[0_0_30px_rgba(197,255,71,0.15)] hover:shadow-[0_0_50px_rgba(197,255,71,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (mode === 'login' ? 'ВХОД...' : 'РЕГИСТРАЦИЯ...')
                : (mode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
