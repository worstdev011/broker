'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLandingAuth } from './LandingAuthContext';

const LANGUAGES = ['РУС', 'ENG', 'UKR'];

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="#C5FF47" fillOpacity="0.12" />
      <path
        d="M16.5 4L9 15.5H14L11.5 24L20 12.5H15L16.5 4Z"
        fill="#C5FF47"
        stroke="#C5FF47"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingNav() {
  const [lang, setLang] = useState('РУС');
  const [langOpen, setLangOpen] = useState(false);
  const { open } = useLandingAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* Glassmorphism bg */}
      <div className="absolute inset-0 bg-[#080C0A]/70 backdrop-blur-md border-b border-white/[0.05]" />

      <nav className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            {lang}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>

          {langOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#111814] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[90px]">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    lang === l
                      ? 'text-lime bg-lime/5'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <LogoIcon />
          <span className="font-display font-800 text-base tracking-[0.2em] uppercase text-white">
            Partners
          </span>
        </Link>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => open('login')}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
          >
            ВОЙТИ
          </button>
          <button
            onClick={() => open('register')}
            className="px-5 py-2 rounded-full text-sm font-bold text-[#080C0A] bg-lime hover:bg-lime-hover transition-all flex items-center gap-1.5"
          >
            РЕГИСТРАЦИЯ
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}
