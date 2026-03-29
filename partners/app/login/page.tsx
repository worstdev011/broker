'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { partnersApi, ApiError } from '@/lib/api/partners-api';
import { usePartnersAuth } from '@/components/providers/PartnersAuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { refreshPartner } = usePartnersAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await partnersApi.login(email, password);
      await refreshPartner();
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Неверный email или пароль');
      else if (err instanceof ApiError && err.status === 403) setError('Аккаунт заблокирован');
      else setError('Ошибка входа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-d-bg flex items-center justify-center p-4">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(197,255,71,0.04) 0%, transparent 60%)' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 select-none group">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <path d="M16.5 4L9 15.5H14L11.5 24L20 12.5H15L16.5 4Z" fill="#C5FF47" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-black text-sm tracking-[0.2em] uppercase text-white leading-none">Partners</p>
              <p className="text-[10px] text-muted tracking-widest uppercase">Кабинет</p>
            </div>
          </Link>
        </div>

        <div className="bg-d-surface border border-d-border rounded-2xl p-7 shadow-lime-lg">
          <h1 className="font-display font-black italic text-xl text-white mb-1 tracking-tight">Войти</h1>
          <p className="text-xs text-muted mb-6">Доступ к партнёрскому кабинету</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="Email"
              className="w-full bg-d-raised border border-d-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/40 focus:bg-d-raised transition"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password" placeholder="Пароль"
              className="w-full bg-d-raised border border-d-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/40 focus:bg-d-raised transition"
            />

            {error && (
              <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-d-bg font-bold text-xs tracking-widest disabled:opacity-50 transition-all shadow-lime-sm hover:shadow-lime-md"
            >
              {loading ? 'ВХОД...' : 'ВОЙТИ'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-5">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-accent hover:text-accent-hover transition font-semibold">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
