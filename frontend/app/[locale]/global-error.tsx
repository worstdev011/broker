'use client';

import { useParams } from 'next/navigation';
import en from '@/messages/en.json';
import ru from '@/messages/ru.json';
import ua from '@/messages/ua.json';

const messages = { en, ru, ua } as const;

type LocaleKey = keyof typeof messages;

function useLocaleBundle() {
  const params = useParams();
  const raw = params && typeof params === 'object' && 'locale' in params
    ? (params as { locale?: string }).locale
    : undefined;
  const locale: LocaleKey = raw === 'ru' || raw === 'ua' ? raw : 'en';
  const lang = raw === 'ru' || raw === 'ua' || raw === 'en' ? raw : 'en';
  return { t: messages[locale].global_error, lang };
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, lang } = useLocaleBundle();

  return (
    <html lang={lang}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#05122a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {t.critical_title}
          </h2>
          <p style={{ opacity: 0.7, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error.message}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                background: '#3347ff',
                color: '#fff',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t.try_again}
            </button>
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {t.back_home}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
