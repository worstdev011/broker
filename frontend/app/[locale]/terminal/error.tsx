'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/components/navigation';

export default function TerminalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-[#05122a]">
      <h2 className="text-xl font-semibold text-white mb-2">{t('error_generic')}</h2>
      <p className="text-white/70 text-sm mb-6 max-w-md text-center">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#2a3ae6] transition-colors"
        >
          {t('retry_action')}
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
        >
          {t('back_to_home')}
        </Link>
      </div>
    </div>
  );
}
