'use client';

import { useState } from 'react';
import { api } from '@/lib/api/api';

interface UserProfile {
  twoFactorEnabled?: boolean;
  email?: string;
  hasPassword?: boolean;
}

interface SecuritySectionProps {
  profile: UserProfile | null;
  onProfileUpdate?: (p: UserProfile) => void;
}

export function SecuritySection({ profile, onProfileUpdate }: SecuritySectionProps) {
  // Смена пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA: idle | show_qr (после enable) | disabling не нужен отдельно - отключение в форме на той же вкладке
  const [step2FA, setStep2FA] = useState<'idle' | 'show_qr'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [enable2FALoading, setEnable2FALoading] = useState(false);
  const [verify2FALoading, setVerify2FALoading] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFASuccess, setTwoFASuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Новый пароль должен быть не менее 8 символов');
      return;
    }
    setPasswordSaving(true);
    try {
      await api('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setPasswordError(e.response?.data?.message || e.message || 'Ошибка смены пароля');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSetInitialPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Пароль должен быть не менее 8 символов');
      return;
    }
    setPasswordSaving(true);
    try {
      await api('/api/user/set-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      const updated = { ...profile, hasPassword: true as const };
      onProfileUpdate?.(updated as UserProfile);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const er = err as { message?: string; response?: { data?: { message?: string } } };
      setPasswordError(er.response?.data?.message || er.message || 'Не удалось установить пароль');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setTwoFAError(null);
    setEnable2FALoading(true);
    try {
      const res = await api<{ qrCode: string }>('/api/user/2fa/enable', {
        method: 'POST',
      });
      setQrCode(res.qrCode);
      setStep2FA('show_qr');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setTwoFAError(e.message || 'Ошибка включения 2FA');
    } finally {
      setEnable2FALoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError(null);
    setVerify2FALoading(true);
    try {
      await api('/api/user/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode }),
      });
      setTwoFASuccess('Двухфакторная аутентификация подключена');
      setStep2FA('idle');
      setVerifyCode('');
      setQrCode(null);
      const updated = { ...profile, twoFactorEnabled: true };
      onProfileUpdate?.(updated);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      setTimeout(() => setTwoFASuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setTwoFAError(e.message || 'Неверный код. Попробуйте снова.');
    } finally {
      setVerify2FALoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError(null);
    setTwoFASuccess(null);
    if (!disable2FAPassword || !disable2FACode) {
      setTwoFAError('Введите пароль и код из приложения');
      return;
    }
    setDisable2FALoading(true);
    try {
      await api('/api/user/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: disable2FAPassword, code: disable2FACode }),
      });
      setTwoFASuccess('2FA отключена');
      setDisable2FAPassword('');
      setDisable2FACode('');
      const updated = { ...profile, twoFactorEnabled: false };
      onProfileUpdate?.(updated);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      setTimeout(() => setTwoFASuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setTwoFAError(e.response?.data?.message || e.message || 'Ошибка отключения 2FA');
    } finally {
      setDisable2FALoading(false);
    }
  };

  const cancel2FASetup = () => {
    setStep2FA('idle');
    setQrCode(null);
    setVerifyCode('');
    setTwoFAError(null);
  };

  const inputClass = 'w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50';
  const labelClass = 'block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2';

  return (
    <>
      {/* Смена пароля */}
      <div className="mt-6 p-6 sm:p-8 rounded-xl bg-[#030E28]">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Смена пароля</h2>
        {profile?.hasPassword === false ? (
          <>
            <p className="text-sm text-white/50 mb-4">
              Вход через Google. Можно задать пароль для входа по email и для операций, где нужен пароль.
            </p>
            <form onSubmit={handleSetInitialPassword} className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl">
                <div>
                  <label className={labelClass}>Новый пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    className={inputClass}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {passwordSaving ? 'Сохранение...' : 'Установить пароль'}
                </button>
                {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-emerald-400">Пароль установлен — теперь доступна смена пароля и отключение 2FA по паролю</p>}
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-white/50 mb-6">Обновите пароль для защиты аккаунта</p>
            <form onSubmit={handleChangePassword} className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className={labelClass}>Текущий пароль</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                    maxLength={128}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Новый пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    className={inputClass}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Подтвердите новый пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                    maxLength={128}
                    required
                  />
                </div>
              </div>
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {passwordSaving ? 'Сохранение...' : 'Изменить пароль'}
                </button>
                {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-emerald-400">Пароль успешно изменён</p>}
              </div>
            </form>
          </>
        )}
      </div>

      {/* 2FA */}
      <div className="mt-6 p-6 sm:p-8 rounded-xl bg-[#030E28]">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Двухфакторная аутентификация (2FA)</h2>
        <p className="text-sm text-white/50 mb-6">Дополнительный уровень защиты при входе и выводе средств</p>

        {twoFAError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {twoFAError}
          </div>
        )}
        {twoFASuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {twoFASuccess}
          </div>
        )}

        {profile?.twoFactorEnabled ? (
          <div className="space-y-6">
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <span className="text-lg" aria-hidden>✓</span>
              Двухфакторная аутентификация подключена
            </p>
            {profile?.hasPassword === false ? (
              <p className="text-sm text-amber-400/90 max-w-xl">
                Аккаунт без пароля (вход через Google). Отключение 2FA с паролем недоступно - обратитесь в поддержку при необходимости.
              </p>
            ) : (
              <form onSubmit={handleDisable2FA} className="w-full">
                <p className="text-sm text-white/60 mb-4">Для отключения введите пароль и текущий код из Google Authenticator.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                  <div>
                    <label className={labelClass}>Пароль</label>
                    <input
                      type="password"
                      value={disable2FAPassword}
                      onChange={(e) => setDisable2FAPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Код из Google Authenticator</label>
                    <input
                      type="text"
                      value={disable2FACode}
                      onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className={`${inputClass} font-mono text-lg tracking-widest`}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={disable2FALoading}
                  className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50 border border-red-500/30"
                >
                  {disable2FALoading ? 'Отключение...' : 'Отключить 2FA'}
                </button>
              </form>
            )}
          </div>
        ) : step2FA === 'show_qr' ? (
          <div className="w-full space-y-6">
            <p className="text-sm text-white/70">
              Отсканируйте QR-код в приложении Google Authenticator (или Authy, Microsoft Authenticator):
            </p>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
              {qrCode && (
                <div className="p-4 rounded-xl bg-white mx-auto sm:mx-0 shrink-0">
                  <img src={qrCode} alt="QR для Google Authenticator" className="w-44 h-44 sm:w-48 sm:h-48 block" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-6">
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div>
                    <label className={labelClass}>Введите 6-значный код из приложения</label>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className={`${inputClass} font-mono text-lg tracking-widest max-w-[200px]`}
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={verify2FALoading}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {verify2FALoading ? 'Проверка...' : 'Подтвердить'}
                    </button>
                    <button
                      type="button"
                      onClick={cancel2FASetup}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium uppercase tracking-wider transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/60">
              При входе и выводе средств потребуется код из приложения Google Authenticator.
            </p>
            <div className="flex sm:justify-start">
              <button
                type="button"
                onClick={handleEnable2FA}
                disabled={enable2FALoading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {enable2FALoading ? 'Загрузка...' : 'Подключить аутентификатор'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
