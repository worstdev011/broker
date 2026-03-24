'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function ScrollToTop() {
  const tc = useTranslations('common');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={tc('up')}
      className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-lg btn-accent text-white shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${
        show
          ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-105'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}
