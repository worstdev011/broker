'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CaretDown, PaperPlaneTilt } from '@phosphor-icons/react';
import { FAQ_STRUCTURE, TOPIC_OPTION_KEYS } from './supportFaqStructure';

function SupportPageSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] p-4 md:p-8 overflow-auto overflow-x-hidden relative">
      <div className="relative w-full">
        {/* Header */}
        <div className="mb-6 md:mb-10">
          <div className="h-7 md:h-9 w-28 md:w-36 bg-white/10 rounded animate-pulse mb-1.5" />
          <div className="h-3 w-48 md:w-64 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Contact card */}
        <div className="mb-8 md:mb-14 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <div className="p-4 md:p-6 border-b border-white/[0.06]">
            <div className="h-4 md:h-5 w-44 md:w-52 bg-white/10 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-48 md:w-64 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6 md:gap-10">
            {/* Form skeleton */}
            <div className="space-y-3 md:space-y-4">
              <div>
                <div className="h-3 w-16 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-10 md:h-12 w-full bg-white/5 rounded-xl animate-pulse" />
              </div>
              <div>
                <div className="h-3 w-24 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-20 md:h-24 w-full bg-white/5 rounded-xl animate-pulse" />
              </div>
              <div className="h-9 md:h-10 w-28 md:w-32 bg-white/5 rounded-xl animate-pulse" />
            </div>
            {/* Contacts sidebar */}
            <div className="grid grid-cols-1 gap-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 md:p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ skeleton */}
        <div className="space-y-6 md:space-y-10">
          <div className="h-4 md:h-5 w-32 md:w-36 bg-white/10 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-6">
            {Array.from({ length: 4 }).map((_, catIdx) => (
              <div key={catIdx} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:p-6">
                <div className="h-3 w-36 md:w-40 bg-white/10 rounded animate-pulse mb-3 md:mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-9 md:h-10 rounded-lg bg-white/[0.03] border border-white/[0.04] animate-pulse" />
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
  const t = useTranslations('support');
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
    <div className="w-full min-h-[calc(100vh-3.5rem)] p-4 md:p-8 overflow-auto overflow-x-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(51,71,255,0.04),transparent_60%)]" />
      <div className="relative w-full">
        <div className="mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t('page_title')}</h1>
          <p className="text-sm text-white/50 mt-1">{t('page_subtitle')}</p>
        </div>

        {/* Как связаться с поддержкой */}
        <div className="mb-8 md:mb-14 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
          <div className="p-4 md:p-6 border-b border-white/[0.06]">
            <h2 className="text-base md:text-lg font-semibold text-white mb-1">{t('contact_title')}</h2>
            <p className="text-sm text-white/50">{t('contact_subtitle')}</p>
          </div>
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 md:gap-10">
            {/* Форма */}
            <div>
              {formSent ? (
                <div className="py-8 px-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">
                  <p className="font-medium">{t('msg_sent')}</p>
                  <p className="text-sm mt-1 text-white/60">{t('msg_sent_hint')}</p>
                  <button
                    type="button"
                    onClick={() => setFormSent(false)}
                    className="mt-4 text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:underline"
                  >
                    {t('send_another')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                      {t('topic_label')}
                    </label>
                    <button
                      ref={topicButtonRef}
                      type="button"
                      onClick={() => setShowTopicModal(!showTopicModal)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={formData.topic ? 'text-white' : 'text-white/40'}>
                          {formData.topic
                            ? t(
                                TOPIC_OPTION_KEYS.find((opt) => opt.value === formData.topic)
                                  ?.labelKey ?? 'topic_other',
                              )
                            : t('select_topic')}
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

                    {/* Выпадающее меню - рендер через portal, вне блока */}
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
                            {TOPIC_OPTION_KEYS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setFormData((d) => ({ ...d, topic: opt.value }));
                                  setShowTopicModal(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                                  formData.topic === opt.value
                                    ? 'bg-[#3347ff]/25 text-white'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {t(opt.labelKey)}
                              </button>
                            ))}
                          </div>
                        </>,
                        document.body
                      )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                      {t('message_label')}
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData((d) => ({ ...d, message: e.target.value }))}
                      placeholder={t('message_placeholder')}
                      rows={3}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!formData.message.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-accent text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                    {t('send')}
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
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{t('hours_title')}</p>
                <p className="text-sm text-white/70 mt-1">{t('hours_weekdays')}</p>
                <p className="text-xs text-white/40 mt-0.5">{t('hours_tz')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">{t('faq_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            {FAQ_STRUCTURE.map((category) => (
              <section key={category.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
                  {t(category.titleKey)}
                </h3>
                <div className="space-y-2">
                  {category.items.map(({ id, q, a }) => {
                    const isOpen = openId === id;
                    return (
                      <div
                        key={id}
                        className="rounded-lg border border-white/[0.04] overflow-hidden transition-all hover:bg-white/[0.03]"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : id)}
                          className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
                        >
                          <span className="font-medium text-white text-[13px] uppercase tracking-wider">
                            {t(q)}
                          </span>
                          <CaretDown
                            className={`w-5 h-5 shrink-0 text-white/40 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-0">
                            <p className="text-sm text-white/60 leading-relaxed">{t(a)}</p>
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
