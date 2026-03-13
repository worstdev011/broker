'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Send } from 'lucide-react';

const FAQ_CATEGORIES = [
  {
    id: 'money',
    title: 'Пополнение и вывод',
    items: [
      {
        id: 'deposit-how',
        question: 'Как пополнить счёт?',
        answer: 'Перейдите в раздел «Кошелёк» → «Пополнение». Выберите способ оплаты (карта Visa/Master, Privat24, Binance Pay, криптовалюта) и введите сумму от 200 до 1000 UAH. Средства зачисляются в течение нескольких минут.',
      },
      {
        id: 'deposit-limits',
        question: 'Какие лимиты на пополнение?',
        answer: 'Минимальная сумма пополнения — 200 UAH, максимальная — 1000 UAH за одну операцию. Вы можете совершать несколько пополнений в день.',
      },
      {
        id: 'deposit-time',
        question: 'Как быстро зачисляются средства?',
        answer: 'Карта Visa/Master и Privat24 — мгновенно. Binance Pay и криптовалюта — 1–5 минут после подтверждения в блокчейне. Банковский перевод — 1–3 рабочих дня.',
      },
      {
        id: 'withdraw-how',
        question: 'Как вывести средства?',
        answer: 'В разделе «Кошелёк» → «Вывод» укажите сумму (от 200 до 1000 UAH) и способ вывода. Заявка обрабатывается в течение 1–3 рабочих дней. Для верифицированных аккаунтов сроки короче.',
      },
      {
        id: 'withdraw-limits',
        question: 'Какие лимиты на вывод?',
        answer: 'Минимум 200 UAH, максимум 1000 UAH за одну операцию. Дневные лимиты могут быть выше для верифицированных пользователей.',
      },
      {
        id: 'withdraw-fee',
        question: 'Есть ли комиссия за вывод?',
        answer: 'Комиссия за вывод средств не взимается. Возможны комиссии платёжной системы или банка — они отображаются перед подтверждением операции.',
      },
      {
        id: 'payment-methods',
        question: 'Какие способы оплаты доступны?',
        answer: 'Карта Visa/Master, Privat24, перевод на карту UAH, Binance Pay, Tether (TRC-20), Bitcoin, Ethereum и другие криптовалюты. Список может отличаться для пополнения и вывода.',
      },
    ],
  },
  {
    id: 'trading',
    title: 'Торговля',
    items: [
      {
        id: 'start-trading',
        question: 'Как начать торговать?',
        answer: 'Перейдите в «Терминал», выберите актив (валютная пара или криптовалюта), срок экспирации (от 5 секунд до 5 минут) и сумму. Укажите направление — Вверх или Вниз. Сделка закрывается автоматически по истечении времени.',
      },
      {
        id: 'demo-account',
        question: 'Что такое демо-счёт?',
        answer: 'Демо-счёт позволяет тренироваться без риска. Вы получаете виртуальный баланс и можете открывать сделки в реальном времени с реальными котировками. Идеально для новичков.',
      },
      {
        id: 'expiration',
        question: 'Что такое срок экспирации?',
        answer: 'Срок экспирации — время до закрытия сделки. Вы выбираете от 5 секунд до 5 минут. В момент экспирации цена сравнивается с ценой входа: выше — вы в плюсе при ставке «Вверх», ниже — при ставке «Вниз».',
      },
      {
        id: 'payout',
        question: 'Какой процент выплат?',
        answer: 'При успешной сделке вы получаете 80% от суммы ставки в качестве прибыли. Например, ставка 100 UAH — прибыль 80 UAH при выигрыше.',
      },
      {
        id: 'instruments',
        question: 'Какие активы доступны для торговли?',
        answer: 'Валютные пары (EUR/USD, GBP/USD, USD/JPY и др.), криптовалюты (BTC, ETH, SOL, BNB). Список активов отображается в терминале при выборе инструмента.',
      },
      {
        id: 'tie',
        question: 'Что происходит при ничьей?',
        answer: 'Если цена на момент экспирации равна цене входа, сделка считается ничьей. Сумма ставки возвращается на счёт без прибыли и без потерь.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Безопасность и верификация',
    items: [
      {
        id: 'verification',
        question: 'Как пройти верификацию?',
        answer: 'Подтвердите email и загрузите документ, удостоверяющий личность (паспорт или ID-карта). Верификация обычно занимает до 24 часов. Это повышает лимиты и ускоряет вывод средств.',
      },
      {
        id: '2fa',
        question: 'Как включить двухфакторную аутентификацию?',
        answer: 'В настройках профиля найдите раздел «Безопасность» и включите 2FA. Сканируйте QR-код в приложении Google Authenticator или аналоге. Сохраните резервные коды в надёжном месте.',
      },
      {
        id: 'protect-account',
        question: 'Как защитить аккаунт?',
        answer: 'Используйте надёжный пароль (минимум 8 символов, буквы и цифры). Включите 2FA. Не передавайте пароль и коды третьим лицам. Рекомендуем регулярно менять пароль.',
      },
      {
        id: 'suspicious',
        question: 'Заметил подозрительную активность. Что делать?',
        answer: 'Немедленно смените пароль и включите 2FA, если ещё не включена. Напишите в поддержку — мы проверим активность и при необходимости заблокируем подозрительные операции.',
      },
      {
        id: 'data-protection',
        question: 'Как защищены мои данные?',
        answer: 'Мы используем 256-bit SSL шифрование для всех соединений. Платёжные данные обрабатываются через сертифицированные платёжные системы. Мы не храним данные карт на своих серверах.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Аккаунт и профиль',
    items: [
      {
        id: 'change-email',
        question: 'Как изменить email?',
        answer: 'Свяжитесь с поддержкой. Смена email требует подтверждения личности для безопасности аккаунта.',
      },
      {
        id: 'change-password',
        question: 'Как сменить пароль?',
        answer: 'Войдите в профиль, перейдите в настройки безопасности. Укажите текущий пароль и новый. Рекомендуем использовать уникальный пароль, который вы не используете на других сайтах.',
      },
      {
        id: 'delete-account',
        question: 'Как удалить аккаунт?',
        answer: 'В настройках профиля найдите раздел «Опасная зона» и нажмите «Удалить аккаунт». Вам потребуется указать причину и пароль. Удаление необратимо — все данные будут удалены.',
      },
      {
        id: 'balance-history',
        question: 'Где посмотреть историю операций?',
        answer: 'В разделе «Кошелёк» → «История транзакций» отображаются все пополнения и выводы с датами, способами и статусами.',
      },
      {
        id: 'trade-history',
        question: 'Где посмотреть историю сделок?',
        answer: 'В «Терминале» откройте список открытых или закрытых сделок. В «Торговом профиле» доступна статистика и динамика баланса.',
      },
    ],
  },
  {
    id: 'other',
    title: 'Прочее',
    items: [
      {
        id: 'minors',
        question: 'Можно ли торговать несовершеннолетним?',
        answer: 'Нет. Использование платформы разрешено только лицам старше 18 лет. При регистрации необходимо подтвердить возраст.',
      },
      {
        id: 'countries',
        question: 'В каких странах доступен сервис?',
        answer: 'Сервис доступен в большинстве стран. Ограничения могут действовать в некоторых юрисдикциях в соответствии с местным законодательством.',
      },
      {
        id: 'taxes',
        question: 'Нужно ли платить налоги с прибыли?',
        answer: 'Налогообложение зависит от законодательства вашей страны. Рекомендуем проконсультироваться с налоговым специалистом. Мы предоставляем историю операций для отчётности.',
      },
      {
        id: 'promo',
        question: 'Как использовать промо-код?',
        answer: 'При пополнении счёта введите промо-код в поле «Промо-код» и нажмите «Применить». Бонус зачислится после подтверждения пополнения.',
      },
      {
        id: 'responsibility',
        question: 'Что такое ответственная торговля?',
        answer: 'Торгуйте только на сумму, которую можете позволить себе потерять. Устанавливайте лимиты, не торгуйте на эмоциях. При необходимости используйте инструменты самоограничения.',
      },
    ],
  },
];

const TOPIC_OPTIONS = [
  { value: 'deposit', label: 'Пополнение' },
  { value: 'withdraw', label: 'Вывод средств' },
  { value: 'trading', label: 'Торговля' },
  { value: 'account', label: 'Аккаунт' },
  { value: 'verification', label: 'Верификация' },
  { value: 'other', label: 'Другое' },
];

function SupportPageSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.5rem)] p-3 sm:p-6 md:p-8 overflow-auto relative">
      <div className="relative w-full">
        {/* Header */}
        <div className="mb-4 sm:mb-10">
          <div className="h-8 sm:h-9 w-36 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Contact card */}
        <div className="mb-6 sm:mb-14 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-white/[0.06]">
            <div className="h-5 w-52 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="p-3 sm:p-6 md:p-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 sm:gap-10">
            {/* Form skeleton */}
            <div className="space-y-4">
              <div>
                <div className="h-3 w-16 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-10 sm:h-12 w-full bg-white/5 rounded-xl animate-pulse" />
              </div>
              <div>
                <div className="h-3 w-24 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-24 w-full bg-white/5 rounded-xl animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
            </div>
            {/* Contacts sidebar */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ skeleton */}
        <div className="space-y-4 sm:space-y-10">
          <div className="h-5 w-36 bg-white/10 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 sm:gap-y-6">
            {Array.from({ length: 5 }).map((_, catIdx) => (
              <div key={catIdx} className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-6">
                <div className="h-3 w-40 bg-white/10 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: catIdx === 0 ? 7 : catIdx === 1 ? 6 : catIdx === 2 ? 5 : 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-white/[0.03] border border-white/[0.04] animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupportTab() {
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({ topic: '', message: '' });
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const topicButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showTopicModal && topicButtonRef.current) {
      const rect = topicButtonRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    } else {
      setDropdownRect(null);
    }
  }, [showTopicModal]);

  if (!mounted) {
    return <SupportPageSkeleton />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    setFormSent(true);
    setFormData({ topic: '', message: '' });
  };

  return (
    <div className="w-full min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.5rem)] p-3 sm:p-6 md:p-8 overflow-auto relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(51,71,255,0.04),transparent_60%)]" />
      <div className="relative w-full">
        <div className="mb-4 sm:mb-10">
          <h1 className="text-lg sm:text-3xl font-bold text-white tracking-tight">Поддержка</h1>
          <p className="text-sm text-white/50 mt-1">
            Ответы на частые вопросы и способы связи
          </p>
        </div>

        {/* Как связаться с поддержкой */}
        <div className="mb-6 sm:mb-14 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
          <div className="p-3 sm:p-6 border-b border-white/[0.06]">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-0.5 sm:mb-1">Связаться с поддержкой</h2>
            <p className="text-sm text-white/50">
              Напишите нам — ответим в течение 24 часов
            </p>
          </div>
          <div className="p-3 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 sm:gap-8 lg:gap-10">
            {/* Форма */}
            <div>
              {formSent ? (
                <div className="py-8 px-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">
                  <p className="font-medium">Сообщение отправлено</p>
                  <p className="text-sm mt-1 text-white/60">Мы ответим вам в ближайшее время</p>
                  <button
                    type="button"
                    onClick={() => setFormSent(false)}
                    className="mt-4 text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:underline"
                  >
                    Отправить ещё
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                      Тема
                    </label>
                    <button
                      ref={topicButtonRef}
                      type="button"
                      onClick={() => setShowTopicModal(!showTopicModal)}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={formData.topic ? 'text-white' : 'text-white/40'}>
                          {formData.topic
                            ? TOPIC_OPTIONS.find((t) => t.value === formData.topic)?.label
                            : 'Выберите тему'}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showTopicModal ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Выпадающее меню — рендер через portal, вне блока */}
                    {showTopicModal &&
                      dropdownRect &&
                      typeof document !== 'undefined' &&
                      createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowTopicModal(false)}
                            aria-hidden="true"
                          />
                          <div
                            className="fixed bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50 min-w-[200px]"
                            style={{
                              top: dropdownRect.top,
                              left: dropdownRect.left,
                              width: dropdownRect.width,
                            }}
                          >
                            {TOPIC_OPTIONS.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => {
                                  setFormData((d) => ({ ...d, topic: t.value }));
                                  setShowTopicModal(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                                  formData.topic === t.value
                                    ? 'bg-[#3347ff]/25 text-white'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </>,
                        document.body
                      )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                      Сообщение
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData((d) => ({ ...d, message: e.target.value }))}
                      placeholder="Опишите ваш вопрос или проблему..."
                      rows={3}
                      required
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!formData.message.trim()}
                    className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl btn-accent text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    Отправить
                  </button>
                </form>
              )}
            </div>

            {/* Telegram, Email, время работы */}
            <div className="space-y-4">
              <a
                href="https://t.me/comfortrade_support"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-[#0088cc]/10 hover:border-[#0088cc]/25 transition-all group"
              >
                <p className="font-medium text-white group-hover:text-[#0088cc] transition-colors">Telegram</p>
                <p className="text-xs text-white/50 mt-0.5">@comfortrade_support</p>
              </a>
              <a
                href="mailto:support@comfortrade.com"
                className="block p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-[#3347ff]/10 hover:border-[#3347ff]/25 transition-all group"
              >
                <p className="font-medium text-white group-hover:text-[#7b8fff] transition-colors">Email</p>
                <p className="text-xs text-white/50 mt-0.5">support@comfortrade.com</p>
              </a>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Время работы</p>
                <p className="text-sm text-white/70 mt-1">Пн–Пт 9:00–21:00</p>
                <p className="text-xs text-white/40 mt-0.5">(Киев, UTC+2)</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-base sm:text-lg font-semibold text-white">Частые вопросы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 sm:gap-y-6">
            {FAQ_CATEGORIES.map((category) => (
              <section key={category.id} className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-6">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.items.map(({ id, question, answer }) => {
                  const isOpen = openId === id;
                  return (
                    <div
                      key={id}
                      className="rounded-lg border border-white/[0.04] overflow-hidden transition-all hover:bg-white/[0.03]"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : id)}
                        className="w-full flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 text-left"
                      >
                        <span className="font-medium text-white text-xs sm:text-[13px] uppercase tracking-wider">{question}</span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 text-white/40 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-sm text-white/60 leading-relaxed">
                            {answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
