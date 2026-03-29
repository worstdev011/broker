'use client';

/**
 * SumsubKyc - embeds the Sumsub WebSDK 2.0 iframe.
 *
 * Usage:
 *   <SumsubKyc userId="user_123" />
 *
 * The component:
 *  1. Calls POST /api/kyc/init to get a short-lived access token.
 *  2. Dynamically loads the Sumsub WebSDK builder script.
 *  3. Launches the SDK inside div#sumsub-container.
 *  4. Provides a token-renewal callback (re-calls /api/kyc/init) because
 *     Sumsub tokens expire after ~10 minutes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { kycApi } from '@/lib/api/client';

// ── Sumsub WebSDK global types ────────────────────────────────────────────────

interface SnsWebSdkBuilder {
  withConf(conf: Record<string, unknown>): SnsWebSdkBuilder;
  withOptions(opts: Record<string, unknown>): SnsWebSdkBuilder;
  on(event: string, handler: (payload: unknown) => void): SnsWebSdkBuilder;
  onMessage(handler: (type: string, payload: unknown) => void): SnsWebSdkBuilder;
  build(): SnsWebSdkInstance;
}

interface SnsWebSdkInstance {
  launch(selector: string): void;
  destroy(): void;
}

interface SnsWebSdk {
  init(
    accessToken: string,
    tokenExpirationHandler: () => Promise<string>,
  ): SnsWebSdkBuilder;
}

declare global {
  interface Window {
    snsWebSdk?: SnsWebSdk;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SDK_SCRIPT_URL =
  'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SumsubKycProps {
  userId: string;
  /** BCP-47 locale, e.g. "en", "ru". Defaults to "en". */
  lang?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "UA", "RU". Pre-selects country in the SDK. */
  country?: string;
  onStepCompleted?: (payload: unknown) => void;
  onApplicantStatusChanged?: (payload: unknown) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SumsubKyc({
  userId,
  lang = 'en',
  country,
  onStepCompleted,
  onApplicantStatusChanged,
}: SumsubKycProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sdkInstanceRef = useRef<SnsWebSdkInstance | null>(null);

  // ── Token helpers ──────────────────────────────────────────────────

  const fetchToken = useCallback(async (): Promise<string> => {
    const { token } = await kycApi.init();
    return token;
  }, []);

  // ── SDK lifecycle ──────────────────────────────────────────────────

  const launchSdk = useCallback(
    async (accessToken: string) => {
      const sdk = window.snsWebSdk;
      if (!sdk) {
        throw new Error('Sumsub WebSDK not loaded');
      }

      const conf: Record<string, unknown> = { lang };
      if (country) conf.country = country;

      const instance = sdk
        .init(accessToken, fetchToken)
        .withConf(conf)
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        .on('onStepCompleted', (payload: unknown) => {
          console.log('[Sumsub] onStepCompleted', payload);
          onStepCompleted?.(payload);
        })
        .on('onApplicantStatusChanged', (payload: unknown) => {
          console.log('[Sumsub] onApplicantStatusChanged', payload);
          onApplicantStatusChanged?.(payload);
        })
        .onMessage((type: string, payload: unknown) => {
          console.log('[Sumsub] message', type, payload);
        })
        .build();

      instance.launch('#sumsub-container');
      sdkInstanceRef.current = instance;
      setStatus('ready');
    },
    [lang, fetchToken, onStepCompleted, onApplicantStatusChanged],
  );

  // ── Load script + init ─────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function init() {
      setStatus('loading');
      setErrorMessage(null);

      try {
        // 1. Get access token from our backend.
        const token = await fetchToken();

        if (cancelled) return;

        // 2. Ensure the WebSDK script is loaded.
        if (!window.snsWebSdk) {
          await loadScript(SDK_SCRIPT_URL);
        }

        if (cancelled) return;

        // 3. Launch.
        await launchSdk(token);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'KYC initialization failed';
          console.error('[Sumsub] init error', err);
          setErrorMessage(message);
          setStatus('error');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      sdkInstanceRef.current?.destroy();
      sdkInstanceRef.current = null;
    };
  }, [userId, fetchToken, launchSdk]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', minHeight: 400 }}>
      {status === 'loading' && (
        <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
          Loading verification…
        </p>
      )}

      {status === 'error' && (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#e53e3e' }}>
          {errorMessage ?? 'Failed to load KYC. Please try again.'}
        </p>
      )}

      {/* The SDK mounts its iframe into this container. */}
      <div id="sumsub-container" style={{ width: '100%' }} />
    </div>
  );
}

// ── Script loader ─────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
