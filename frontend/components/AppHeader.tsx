'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Link, useRouter, usePathname } from '@/components/navigation';
import { Wallet, UserCircle, Repeat, MessageCircle, ArrowLeft, ChevronRight, TrendingUp, PlusCircle } from 'lucide-react';
import { NotificationsBell } from '@/components/NotificationsBell';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDisplayName } from '@/lib/hooks/useDisplayName';
import { api } from '@/lib/api/api';
import { useAccountStore } from '@/stores/account.store';
import { useAccountSwitch } from '@/lib/hooks/useAccountSwitch';
import { formatCurrencySymbol } from '@/lib/formatCurrency';
import type { AccountSnapshot } from '@/types/account';

type NotificationType = 'system' | 'trade' | 'deposit' | 'promo';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const HARDCODED_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'promo',
    title: 'Добро пожаловать!',
    message: 'Рады видеть вас на платформе Comfortrade. Начните с демо-счёта - без риска.',
    time: 'только что',
    read: false,
  },
  {
    id: '2',
    type: 'deposit',
    title: 'Пополнение счёта',
    message: 'Ваш реальный счёт успешно пополнен. Средства доступны для торговли.',
    time: '2 ч назад',
    read: false,
  },
  {
    id: '3',
    type: 'trade',
    title: 'Сделка закрыта',
    message: 'EUR/USD · CALL · Выигрыш +340 UAH. Отличный результат!',
    time: '5 ч назад',
    read: false,
  },
  {
    id: '4',
    type: 'system',
    title: 'Обновление платформы',
    message: 'Добавлены новые активы и улучшена производительность графика.',
    time: 'вчера',
    read: true,
  },
  {
    id: '5',
    type: 'promo',
    title: 'Бонус 20% на депозит',
    message: 'Только до конца недели - пополните счёт и получите бонус 20%.',
    time: '2 дня назад',
    read: true,
  },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const isProfilePage = pathname?.startsWith('/profile');
  const { logout, user } = useAuth();
  const snapshot = useAccountStore((s) => s.snapshot);
  const { switchAccount } = useAccountSwitch();
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayedBalance, setDisplayedBalance] = useState('0.00');
  const [modalBalances, setModalBalances] = useState<{
    demo: { balance: string; currency: string } | null;
    real: { balance: string; currency: string } | null;
  }>({ demo: null, real: null });
  const terminalHref = accountType === 'demo' ? '/terminal/demo' : '/terminal';
  const accountTypeShort = accountType === 'demo' ? 'Демо' : 'Реал';
  const accountTypeBadgeClass = accountType === 'demo'
    ? 'bg-[#2478ff]/20 text-[#6ba4ff] border border-[#2478ff]/40'
    : 'bg-[#1f9d5a]/20 text-[#44d08a] border border-[#1f9d5a]/40';

  const { displayName: displayIdentity, avatarInitial, isGuest } = useDisplayName();

  useEffect(() => {
    const initSnapshot = async () => {
      try {
        const snap = await api<AccountSnapshot>('/api/account/snapshot');
        useAccountStore.getState().setSnapshot(snap);
      } catch {
        // ignore
      }
    };
    initSnapshot();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api<{ user: { avatarUrl?: string | null } }>('/api/user/profile');
        setAvatarUrl(res.user.avatarUrl || null);
      } catch {
        // ignore
      }
    };
    loadProfile();

    const handleProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ avatarUrl?: string | null }>).detail;
      if (detail && 'avatarUrl' in detail) {
        setAvatarUrl(detail.avatarUrl || null);
      }
    };
    document.addEventListener('profile-updated', handleProfileUpdated);
    return () => document.removeEventListener('profile-updated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    if (snapshot) {
      const newType = snapshot.type === 'DEMO' ? 'demo' : 'real';
      if (accountType !== newType) setAccountType(newType);
    }
  }, [snapshot, accountType]);

  useEffect(() => {
    if (!snapshot) {
      setDisplayedBalance('0.00');
      return;
    }
    setDisplayedBalance(snapshot.balance.toFixed(2));
  }, [snapshot?.balance, snapshot?.accountId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccountModal(false);
        setShowProfileModal(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);


  const loadAllBalances = async () => {
    try {
      const res = await api<{ accounts: Array<{ type: string; balance: string; currency: string; isActive: boolean }> }>('/api/accounts');
      const demo = res.accounts.find((a) => a.type === 'demo' && a.isActive) || res.accounts.find((a) => a.type === 'demo');
      if (demo) {
        setModalBalances((p) => ({ ...p, demo: { balance: parseFloat(demo.balance).toFixed(2), currency: demo.currency } }));
      }
      try {
        const real = await api<{ currency: string; balance: number }>('/api/wallet/balance');
        setModalBalances((p) => ({ ...p, real: { balance: real.balance.toFixed(2), currency: real.currency } }));
      } catch {
        setModalBalances((p) => ({ ...p, real: null }));
      }
    } catch {
      // ignore
    }
  };

  const getCurrentBalance = () => {
    if (!snapshot) return { balance: '0.00', currency: 'UAH' };
    return { balance: snapshot.balance.toFixed(2), currency: snapshot.currency };
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };


  return (
    <header className="bg-[#05122a] border-b border-white/10 shrink-0 relative z-[160]">
      <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Image src="/images/logo.png" alt="Comfortrade" width={40} height={40} className="h-8 sm:h-10 w-auto object-contain" />
          <span className="hidden sm:inline text-base sm:text-xl font-semibold text-white uppercase truncate max-w-[140px] sm:max-w-none">Comfortrade</span>
          <NotificationsBell dropdownAlign="left" zIndex={180} />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60 pointer-events-none" />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#05122a] z-10 pointer-events-none ${accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-500'}`} title={accountType === 'demo' ? t('demo_account') : t('real_account')} />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowProfileModal(!showProfileModal)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfileModal((v) => !v); } }}
              className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer md:hover:opacity-90 transition-opacity overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#05122a] shadow-lg"
              aria-label="Открыть меню профиля"
              aria-expanded={showProfileModal}
              aria-haspopup="menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl?.startsWith('/') ? avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || ''}${avatarUrl}`} alt="" className="w-full h-full object-cover rounded-full" aria-hidden />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-sm font-bold text-white">
                  {isGuest ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  ) : avatarInitial}
                </div>
              )}
            </div>

            {showProfileModal && (
              <>
                <div className="fixed inset-0 z-[170]" onClick={() => setShowProfileModal(false)} aria-hidden="true" />
                <div role="menu" aria-label="Меню профиля" className="absolute left-full right-auto top-full mt-2 -ml-32 w-[280px] bg-[#1a2438] border border-white/[0.08] rounded-[14px] backdrop-blur-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[180] overflow-hidden p-2 md:left-1/2 md:ml-0 md:-translate-x-1/2">
                  <div className="px-3 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#2478ff]">
                        {isGuest ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                          </svg>
                        ) : (
                          <span className="text-sm font-semibold text-white">{avatarInitial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{displayIdentity}</div>
                        <div className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${accountTypeBadgeClass}`}>
                          {accountType === 'demo' ? t('demo_account') : t('real_account')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pt-3 pb-2 flex justify-center">
                    <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="shrink-0 h-7 inline-flex items-center px-3 rounded-md border border-[#2478ff] text-[#2478ff] text-xs font-medium md:hover:bg-[#2478ff]/10 transition-colors duration-150">
                      <span>{t('topup_account')}</span>
                    </Link>
                  </div>
                  <div className="px-2 pb-1 space-y-1">
                    <button type="button" role="menuitem" onClick={() => { setShowProfileModal(false); setShowAccountModal(true); loadAllBalances(); }} className="group w-full h-[38px] px-3 rounded-lg flex items-center gap-2.5 text-left md:hover:bg-white/[0.06] transition-colors duration-150">
                      <Repeat className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-150" aria-hidden />
                      <span className="text-[13px] text-white/80 group-hover:text-white transition-colors duration-150">{t('switch_account')}</span>
                      <span className="ml-auto text-[11px] text-white/50 group-hover:text-white/80 transition-colors duration-150">{accountTypeShort}</span>
                      <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-150" />
                    </button>
                    <Link href="/profile" onClick={() => setShowProfileModal(false)} className="group h-[38px] px-3 rounded-lg flex items-center gap-2.5 md:hover:bg-white/[0.06] transition-colors duration-150">
                      <UserCircle className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-150" />
                      <span className="text-[13px] text-white/80 group-hover:text-white transition-colors duration-150">{t('profile')}</span>
                    </Link>
                    <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="group h-[38px] px-3 rounded-lg flex items-center gap-2.5 md:hover:bg-white/[0.06] transition-colors duration-150">
                      <Wallet className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-150" />
                      <span className="text-[13px] text-white/80 group-hover:text-white transition-colors duration-150">{t('wallet')}</span>
                    </Link>
                    <Link href="/profile?tab=support" onClick={() => setShowProfileModal(false)} className="group h-[38px] px-3 rounded-lg flex items-center gap-2.5 md:hover:bg-white/[0.06] transition-colors duration-150">
                      <MessageCircle className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-150" />
                      <span className="text-[13px] text-white/80 group-hover:text-white transition-colors duration-150">{t('support')}</span>
                    </Link>
                  </div>
                  <div className="border-t border-white/[0.06] my-1" />
                  <div className="px-2 pb-2">
                    <button type="button" role="menuitem" onClick={() => { setShowProfileModal(false); handleLogout(); }} className="w-full h-[38px] px-3 rounded-lg flex items-center gap-2.5 text-[#ff4655] md:hover:bg-[rgba(255,69,85,0.08)] transition-colors duration-150" aria-label={t('logout')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex flex-col relative pr-3" data-account-modal>
              <div className="flex items-center gap-1.5 cursor-pointer md:hover:opacity-80 transition-colors" data-account-modal onClick={async () => { await loadAllBalances(); setShowAccountModal(true); }}>
                <span className="text-xs text-white font-medium">{accountType === 'demo' ? t('demo_account') : t('real_account')}</span>
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <div className="text-base font-semibold text-white">
                {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${formatCurrencySymbol(snapshot.currency)}` : '...'}
              </div>
              {showAccountModal && (
                <>
                  <div className="fixed inset-0 z-[140]" onClick={() => setShowAccountModal(false)} />
                  <div className="absolute top-full right-0 left-auto mt-2 w-72 bg-[#1a2438] border border-white/5 rounded-lg shadow-xl z-[150] md:left-1/2 md:right-auto md:-translate-x-1/2" data-account-modal>
                    <div className="p-3 space-y-2.5">
                      <div className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'real' ? 'bg-white/10' : 'md:hover:bg-white/5'}`} onClick={async () => { await switchAccount('REAL'); setShowAccountModal(false); }}>
                        <div className="mt-0.5">{accountType === 'real' ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#061230]" /></div> : <div className="w-4 h-4 rounded-full border-2 border-[#3347ff]" />}</div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-white font-medium mb-0.5 text-sm">{t('real_account')}</div>
                            <div className="text-white/60 text-xs">{hideBalance ? '••••••' : (modalBalances.real ? `${modalBalances.real.balance} ${formatCurrencySymbol(modalBalances.real.currency)}` : (snapshot?.type === 'REAL' ? `${getCurrentBalance().balance} ${formatCurrencySymbol(getCurrentBalance().currency)}` : '...'))}</div>
                          </div>
                          <Link href="/profile?tab=wallet" onClick={(e) => e.stopPropagation()} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white text-xs font-semibold md:hover:from-[#3347ff]/90 md:hover:to-[#1e2fcc]/90 transition-all shadow-md shadow-[#3347ff]/20">
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>{t('topup')}</span>
                          </Link>
                        </div>
                      </div>
                      <div className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'demo' ? 'bg-white/10' : 'md:hover:bg-white/5'}`} onClick={async () => { await switchAccount('DEMO'); setShowAccountModal(false); }}>
                        <div className="mt-0.5">{accountType === 'demo' ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#061230]" /></div> : <div className="w-4 h-4 rounded-full border-2 border-[#3347ff]" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium mb-0.5 text-sm">{t('demo_account')}</div>
                          <div className="text-white/60 text-xs">{hideBalance ? '••••••' : (modalBalances.demo ? `${modalBalances.demo.balance} ${formatCurrencySymbol(modalBalances.demo.currency)}` : (snapshot?.type === 'DEMO' ? `${getCurrentBalance().balance} ${formatCurrencySymbol(getCurrentBalance().currency)}` : '...'))}</div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-white/10 p-3">
                      <div className="flex items-center gap-2.5 cursor-pointer md:hover:opacity-80 transition-colors" onClick={() => setHideBalance(!hideBalance)}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{hideBalance ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></> : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}</svg>
                        <span className="text-white text-xs">{t('hide_balance')}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isProfilePage ? (
              <Link href={terminalHref} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium transition-all shrink-0" title={t('terminal')}>
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{t('terminal')}</span>
              </Link>
            ) : (
              <Link href="/profile?tab=wallet" className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-2.5 sm:px-3 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white md:hover:from-[#3347ff]/90 md:hover:to-[#1e2fcc]/90 transition-all shrink-0" title={t('topup_account')}>
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm font-semibold uppercase tracking-wider">{t('topup_account')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
