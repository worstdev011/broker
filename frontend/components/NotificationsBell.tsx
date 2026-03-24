'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from '@phosphor-icons/react';

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


export function NotificationsBell({ dropdownAlign = 'left', zIndex = 180 }: { dropdownAlign?: 'left' | 'right'; zIndex?: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(HARDCODED_NOTIFICATIONS);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      el.classList.add('scrolling');
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => el.classList.remove('scrolling'), 1000);
    };
    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white md:hover:bg-white/10 transition-colors shrink-0 relative"
        aria-label="Уведомления"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
      </button>

      {open && (
        <>
          <div className="fixed inset-0" style={{ zIndex: zIndex - 1 }} onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`absolute top-full mt-2 w-[340px] bg-[#0d1e3a] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[480px] ${dropdownAlign === 'right' ? 'right-0' : 'left-0'}`}
            style={{ zIndex }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white/40" />
                <span className="text-sm font-semibold text-white">Уведомления</span>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                  className="text-[11px] text-white/40 md:hover:text-white/80 transition-colors"
                >
                  Прочитать все
                </button>
              )}
            </div>

            {/* List */}
            <div ref={listRef} className="overflow-y-auto flex-1 py-1 scrollbar-hide-on-idle">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell className="w-8 h-8 text-white/10" />
                  <span className="text-sm text-white/30">Нет уведомлений</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => markRead(notif.id)}
                    className={`w-full text-left px-3 py-3 mx-1 rounded-lg flex items-start gap-3 transition-colors md:hover:bg-white/[0.06] ${!notif.read ? 'bg-white/[0.04]' : ''}`}
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[13px] font-medium ${notif.read ? 'text-white/50' : 'text-white/90'}`}>{notif.title}</span>
                        <span className="text-[10px] text-white/25 shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3347ff] shrink-0 mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
