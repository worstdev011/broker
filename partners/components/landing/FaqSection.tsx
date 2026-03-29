'use client';

import { useState } from 'react';

const ITEMS = [
  {
    q: 'КАКИЕ ИСТОЧНИКИ ТРАФИКА РАЗРЕШЕНЫ?',
    a: 'Принимаем SEO, контекст, тизеры, соцсети, email, push-уведомления и нативную рекламу. Запрещён мотивированный трафик, спам и брендовый контекст.',
  },
  {
    q: 'КАК ЧАСТО ПРОИСХОДЯТ ВЫПЛАТЫ?',
    a: 'По согласованному графику. Возможны ускоренные выплаты и авансы для активных партнёров.',
  },
  {
    q: 'ЕСТЬ ЛИ ХОЛДЫ/РЕТРО-КОРРЕКЦИИ?',
    a: 'Холд до 14 дней для новых партнёров. После верификации качества трафика холд снимается. Ретро-коррекции применяются только при нарушении правил.',
  },
  {
    q: 'КАКИЕ МИНИМАЛЬНЫЕ СТАВКИ?',
    a: 'RevShare от 30% для новичков с ростом до 80% по объёму. CPA согласовывается индивидуально — от $50 за FTD в зависимости от гео и качества.',
  },
  {
    q: 'КАК ПОЛУЧИТЬ ДОСТУП К АНАЛИТИКЕ?',
    a: 'После регистрации и подтверждения аккаунта вам открывается полный дашборд: клики, регистрации, FTD, заработок по дням с графиками.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(1);

  return (
    <section className="bg-[#080C0A] py-24">
      <div className="max-w-3xl mx-auto px-6">

        <h2
          className="font-display font-black italic text-white mb-12 tracking-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          FAQ
        </h2>

        <div className="space-y-3">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-white/[0.08] bg-[#0D120B] overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                >
                  <span className="font-display font-bold text-white text-xs sm:text-sm tracking-widest">
                    {item.q}
                  </span>
                  <span
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#080C0A] font-bold text-lg transition-colors ${
                      isOpen ? 'bg-lime' : 'bg-lime hover:bg-lime-hover'
                    }`}
                  >
                    {isOpen ? '×' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-white/50 text-sm leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
