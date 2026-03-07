'use client';

import { Link } from '@/components/navigation'
import { useTranslations } from 'next-intl'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error')
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-[#05122a]">
      <h2 className="text-xl font-semibold text-white mb-2">{t('title')}</h2>
      <p className="text-white/70 text-sm mb-6 max-w-md text-center">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg btn-accent text-white font-medium transition-colors"
        >
          {t('try_again')}
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
        >
          {t('to_home')}
        </Link>
      </div>
    </div>
  );
}
