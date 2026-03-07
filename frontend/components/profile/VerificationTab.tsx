'use client';

/**
 * Верификация аккаунта (KYC).
 * TODO: Планируется интеграция SumSub — загрузка документов и проверка личности
 * будут выполняться через SumSub Web SDK.
 */

import { useState } from 'react';
import { FileCheck, Clock, CheckCircle2, FileText } from 'lucide-react';

const VERIFICATION_STORAGE_KEY = 'profile-verification-status';

type VerificationStatus = 'intro' | 'pending' | 'verified';

function getStoredStatus(): VerificationStatus {
  if (typeof window === 'undefined') return 'intro';
  const stored = localStorage.getItem(VERIFICATION_STORAGE_KEY);
  if (stored === 'pending' || stored === 'verified') return stored;
  return 'intro';
}

export function VerificationSection() {
  const [status, setStatus] = useState<VerificationStatus>(getStoredStatus);
  const [starting, setStarting] = useState(false);

  const handleStartVerification = async () => {
    setStarting(true);
    // TODO: Интеграция SumSub — здесь будет открытие SumSub Web SDK для загрузки документов
    await new Promise((r) => setTimeout(r, 800));
    setStatus('pending');
    localStorage.setItem(VERIFICATION_STORAGE_KEY, 'pending');
    setStarting(false);
  };

  return (
    <div className="w-full rounded-xl bg-white/5 p-6 space-y-6">
      {/* Этап 1: Приветствие, описание документов, кнопка «Начать верификацию» */}
      {status === 'intro' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Добро пожаловать в процесс верификации</h3>
            <p className="text-xs sm:text-sm text-white/70 mb-4 leading-relaxed">
              Для завершения верификации аккаунта необходимо загрузить документы, подтверждающие вашу личность.
              Это стандартная процедура KYC, которая повышает безопасность платформы и позволяет снять ограничения.
            </p>
            <p className="text-xs sm:text-sm font-medium text-white/80 mb-2">Требуемые документы:</p>
            <ul className="space-y-2 text-xs sm:text-sm text-white/60">
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Документ, удостоверяющий личность (паспорт, водительские права или ID-карта)</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Подтверждение адреса проживания — не старше 3 месяцев (опционально)</span>
              </li>
            </ul>
            <p className="text-[11px] sm:text-xs text-white/40 mt-4">
              Форматы: JPG, PNG, PDF. Максимальный размер файла — 10 МБ.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStartVerification}
              disabled={starting}
              className="flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Запуск...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Начать верификацию
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Этап 2: Документы на проверке */}
      {status === 'pending' && (
        <div className="py-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 mb-4">
              <Clock className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Документы отправлены на проверку</h3>
            <p className="text-sm text-white/70 max-w-md mx-auto mb-6">
              Ваши документы получены и находятся на проверке. Обычно верификация занимает до 24 часов.
              Мы уведомим вас по email о результате.
            </p>
            <p className="text-xs text-white/50 mb-4">
              В случае вопросов обратитесь в службу поддержки
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStatus('verified');
                    localStorage.setItem(VERIFICATION_STORAGE_KEY, 'verified');
                  }}
                  className="text-xs text-white/40 hover:text-white/60 underline"
                >
                  [Тест: считать верифицированным]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('intro');
                    localStorage.removeItem(VERIFICATION_STORAGE_KEY);
                  }}
                  className="text-xs text-white/40 hover:text-white/60 underline"
                >
                  [Тест: сбросить]
                </button>
              </div>
            )}
        </div>
      )}

      {/* Этап 3: Успешно верифицирован */}
      {status === 'verified' && (
        <div className="py-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Аккаунт успешно верифицирован</h3>
            <p className="text-sm text-white/70 max-w-md mx-auto mb-4">
              Ваша личность подтверждена. Теперь вам доступен вывод средств и все возможности платформы.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={() => {
                  setStatus('intro');
                  localStorage.removeItem(VERIFICATION_STORAGE_KEY);
                }}
                className="text-xs text-white/40 hover:text-white/60 underline"
              >
                [Тест: сбросить верификацию]
              </button>
            )}
        </div>
      )}
    </div>
  );
}
