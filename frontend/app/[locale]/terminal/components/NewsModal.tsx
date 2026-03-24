'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, X } from '@phosphor-icons/react';

type NewsItem = typeof NEWS_ITEMS[number];

const NEWS_ITEMS = [
  {
    id: '1',
    title: 'EUR/USD растёт на позитивных данных по инфляции',
    date: '2026-03-18T10:30:00Z',
    category: 'Форекс',
    excerpt: 'Европейская валюта укрепилась после публикации данных по инфляции в еврозоне, которые оказались лучше ожиданий аналитиков.',
    body: 'Пара EUR/USD выросла на 0,4% после выхода данных по инфляции в еврозоне, которые превзошли ожидания рынка. Индекс потребительских цен вырос на 2,6% в годовом исчислении - аналитики прогнозировали 2,4%.\n\nЕЦБ пока воздерживается от комментариев, однако трейдеры уже закладывают снижение вероятности дальнейшего смягчения политики регулятора. Ближайший уровень сопротивления находится на отметке 1,0920, поддержка - 1,0840.\n\nНа следующей неделе инвесторы будут следить за выступлением главы ФРС и данными по занятости в США, которые могут скорректировать движение пары.',
    sentiment: { direction: 'up', strength: 2 } as const,
  },
  {
    id: '2',
    title: 'Bitcoin достиг нового максимума',
    date: '2026-03-18T09:15:00Z',
    category: 'Криптовалюты',
    excerpt: 'Крупнейшая криптовалюта продолжает показывать впечатляющие результаты, привлекая внимание институциональных инвесторов.',
    body: 'Bitcoin пробил исторический максимум на фоне роста институционального спроса и ожиданий очередного халвинга. Объём торгов за последние 24 часа превысил $48 млрд - рекордный показатель с начала года.\n\nКрупные хедж-фонды и ETF-провайдеры активно наращивают позиции. По данным on-chain аналитики, количество «китов» - адресов с балансом свыше 1 000 BTC - выросло на 12% за последний месяц.\n\nТехнически пара BTC/USD удерживается выше 200-дневной скользящей средней. Следующая цель быков - психологическая отметка $100 000.',
    sentiment: { direction: 'up', strength: 3 } as const,
  },
  {
    id: '3',
    title: 'ФРС сохраняет текущую процентную ставку',
    date: '2026-03-18T08:00:00Z',
    category: 'Экономика',
    excerpt: 'Решение Федеральной резервной системы США оказало значительное влияние на динамику основных валютных пар.',
    body: 'На последнем заседании FOMC члены комитета проголосовали за сохранение ставки по федеральным фондам на уровне 5,25-5,50%. Решение совпало с прогнозами большинства аналитиков.\n\nДжером Пауэлл в ходе пресс-конференции подчеркнул, что регулятор по-прежнему следит за данными по инфляции и не торопится со смягчением политики. Рынки отреагировали снижением: S&P 500 просел на 0,8%, а доллар укрепился к корзине основных валют.\n\nСледующее заседание запланировано на май. Участники фьючерсного рынка оценивают вероятность снижения ставки в 28%.',
    sentiment: { direction: 'down', strength: 1 } as const,
  },
  {
    id: '4',
    title: 'Нефть Brent: анализ ключевых уровней на неделю',
    date: '2026-03-17T16:45:00Z',
    category: 'Товары',
    excerpt: 'Аналитики рассматривают ключевые уровни поддержки и сопротивления для нефти марки Brent.',
    body: 'Нефть марки Brent торгуется в диапазоне $82-86 за баррель. Ключевая поддержка - $82,50, пробой ниже которой откроет путь к $79. Сопротивление расположено у отметки $86,20.\n\nОПЕК+ пока придерживается плана по добыче, однако некоторые члены картеля заявляют о готовности увеличить квоты при необходимости. Запасы нефти в США на прошлой неделе выросли на 3,2 млн баррелей - больше ожиданий.\n\nДополнительное давление на котировки оказывает укрепление доллара. Трейдерам стоит отслеживать данные по запасам EIA в среду.',
    sentiment: { direction: 'down', strength: 2 } as const,
  },
  {
    id: '5',
    title: 'Золото растёт на фоне геополитической напряжённости',
    date: '2026-03-17T14:20:00Z',
    category: 'Товары',
    excerpt: 'Цены на золото продолжают расти на фоне усиления геополитической неопределённости.',
    body: 'Золото прибавило 1,2% за неделю, преодолев отметку $2 380 за тройскую унцию. Главным драйвером роста выступает спрос на защитные активы на фоне обострения геополитической обстановки на Ближнем Востоке.\n\nЦентральные банки развивающихся стран продолжают наращивать золотые резервы. По данным МВФ, суммарные закупки в первом квартале превысили 280 тонн.\n\nТехнически металл сформировал «бычий» флаг на недельном графике. При закреплении выше $2 400 следующая цель - $2 450-2 480.',
    sentiment: { direction: 'up', strength: 3 } as const,
  },
  {
    id: '6',
    title: 'GBP/USD: повышенная волатильность после переговоров',
    date: '2026-03-17T12:10:00Z',
    category: 'Форекс',
    excerpt: 'Британский фунт демонстрирует повышенную волатильность в связи с новыми торговыми переговорами.',
    body: 'Пара GBP/USD за последние три сессии показала диапазон более 130 пунктов - один из самых широких с начала года. Причиной стала неопределённость вокруг новых торговых договорённостей между Великобританией и ЕС.\n\nБанк Англии сохраняет ставку на уровне 5,00%, однако риторика регулятора стала более «голубиной» на последнем заседании. Следующий релиз по инфляции в Великобритании запланирован на следующей неделе и может оказать решающее влияние.\n\nТехнически пара удерживается у ключевой поддержки 1,2640. Пробой открывает путь к 1,2580.',
    sentiment: { direction: 'down', strength: 1 } as const,
  },
  {
    id: '7',
    title: 'Технический анализ: паттерны на USD/JPY',
    date: '2026-03-17T10:30:00Z',
    category: 'Анализ',
    excerpt: 'Эксперты выделяют важные технические уровни и паттерны для торговой пары USD/JPY.',
    body: 'USD/JPY продолжает консолидироваться в диапазоне 149,50-151,90. На дневном графике сформировался паттерн «симметричный треугольник», выход из которого может определить направление движения на следующие 2-3 недели.\n\nЯпонский регулятор по-прежнему воздерживается от интервенций, хотя официальные лица неоднократно предупреждали о готовности действовать при резких движениях курса.\n\nПокупатели стремятся закрепиться выше 151,50 для атаки на годовой максимум 152,00. Продавцы, в свою очередь, защищают уровень 149,80.',
    sentiment: { direction: 'up', strength: 1 } as const,
  },
  {
    id: '8',
    title: 'Обзор альткоинов и их потенциала роста',
    date: '2026-03-17T08:15:00Z',
    category: 'Криптовалюты',
    excerpt: 'Анализ перспективных альткоинов и их потенциала для инвестиций в текущем рыночном цикле.',
    body: 'На фоне ралли Bitcoin ряд альткоинов показывает опережающую динамику. Ethereum прибавил 18% за две недели, Solana - 24%. Аналитики указывают на рост активности в DeFi и NFT-секторе как на ключевые драйверы.\n\nОсобое внимание привлекает сектор Layer-2 решений: Arbitrum и Optimism демонстрируют рекордные объёмы транзакций. Ряд проектов готовится к крупным обновлениям протокола в апреле.\n\nПри этом альткоины остаются высоковолатильными инструментами. Управление рисками и диверсификация портфеля критически важны в текущих условиях.',
    sentiment: { direction: 'up', strength: 2 } as const,
  },
];

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
}

function SentimentArrows({ direction, strength, size = 'sm' }: { direction: 'up' | 'down'; strength: 1 | 2 | 3; size?: 'sm' | 'md' }) {
  const isUp = direction === 'up';
  const color = isUp ? '#4ade80' : '#f87171';
  const w = size === 'md' ? 14 : 12;
  const h = size === 'md' ? 16 : 14;
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 3 }).map((_, i) => {
        const active = i < strength;
        return (
          <svg key={i} width={w} height={h} viewBox="0 0 10 12" fill="none"
            style={{ opacity: active ? 1 : 0.18, transform: isUp ? 'none' : 'rotate(180deg)' }}
          >
            <path d="M5 1L9 8H1L5 1Z" fill={color} />
          </svg>
        );
      })}
    </div>
  );
}

function NewsPlaceholderImage({ category, tall }: { category: string; tall?: boolean }) {
  return (
    <div className={`w-full ${tall ? 'h-48' : 'h-32'} bg-gradient-to-br from-[#0d1e4a] to-[#1a2d5a] flex items-center justify-center relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(99,140,255,0.15) 24px,rgba(99,140,255,0.15) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(99,140,255,0.15) 24px,rgba(99,140,255,0.15) 25px)',
      }} />
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-20">
        <rect x="2" y="2" width="36" height="36" rx="4" stroke="white" strokeWidth="2"/>
        <circle cx="14" cy="14" r="4" stroke="white" strokeWidth="2"/>
        <path d="M2 28l10-8 8 6 8-10 10 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="absolute bottom-2 left-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest">{category}</span>
    </div>
  );
}

function NewsCard({ news, onClick }: { news: NewsItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[#1f2a45] rounded-lg overflow-hidden group"
    >
      {/* Image with hover overlay */}
      <div className="relative">
        <NewsPlaceholderImage category={news.category} />
        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/50 transition-all duration-200" />
        {/* "Читать подробнее" label */}
        <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium text-white">Читать подробнее</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      {/* Text content */}
      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-white leading-snug">{news.title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{news.excerpt}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] text-gray-500">{formatDate(news.date)}</span>
          <SentimentArrows direction={news.sentiment.direction} strength={news.sentiment.strength} />
        </div>
      </div>
    </button>
  );
}

export function NewsModal({ onClose }: { onClose: () => void }) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openDetail = (news: NewsItem) => {
    setSelectedNews(news);
    setTimeout(() => setShowDetail(true), 20);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setTimeout(() => setSelectedNews(null), 220);
  };

  useEffect(() => {
    const attachScroll = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      const fn = () => {
        el.classList.add('scrolling');
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => el.classList.remove('scrolling'), 1000);
      };
      el.addEventListener('scroll', fn);
      return () => el.removeEventListener('scroll', fn);
    };
    const c1 = attachScroll(listScrollRef.current);
    const c2 = attachScroll(detailScrollRef.current);
    return () => { c1(); c2(); };
  }, [selectedNews]);

  return (
    <div className="fixed left-0 top-[53px] sm:top-[69px] bottom-[max(4.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-50 w-full md:static md:h-full md:w-[330px] md:z-auto md:bottom-auto md:top-auto bg-[#0a1635] border-r border-white/10 shadow-2xl flex flex-col overflow-hidden">
      {/* Карусель: два панели в один горизонтальный ряд, сдвигаемся translate */}
      <div
        className="flex h-full min-h-0"
        style={{
          width: '200%',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          transform: showDetail ? 'translateX(-50%)' : 'translateX(0)',
        }}
      >
        {/* Список новостей */}
        <div className="flex flex-col min-h-0" style={{ width: '50%' }}>
          <div className="px-5 pt-4 shrink-0 border-b border-white/10">
            <div className="flex items-center justify-between gap-2 pb-3">
              <div className="text-sm font-medium text-white">Новости</div>
              <button
                type="button"
                onClick={onClose}
                className="md:hidden shrink-0 -mr-1 w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 active:bg-white/10"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" weight="bold" />
              </button>
            </div>
          </div>
          <div ref={listScrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-hide-on-idle">
            <div className="flex flex-col gap-3">
              {NEWS_ITEMS.map((news) => (
                <NewsCard key={news.id} news={news} onClick={() => openDetail(news)} />
              ))}
            </div>
          </div>
        </div>

        {/* Детальная статья */}
        <div className="flex flex-col min-h-0" style={{ width: '50%' }}>
          {selectedNews && (
            <>
              <div className="px-4 pt-4 pb-3 shrink-0 border-b border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 md:hover:text-white md:hover:bg-white/10 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" weight="bold" />
                </button>
                <span className="text-sm font-medium text-white truncate min-w-0">{selectedNews.category}</span>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <SentimentArrows direction={selectedNews.sentiment.direction} strength={selectedNews.sentiment.strength} size="md" />
                  <button
                    type="button"
                    onClick={onClose}
                    className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 active:bg-white/10 -mr-1"
                    aria-label="Закрыть"
                  >
                    <X className="w-5 h-5" weight="bold" />
                  </button>
                </div>
              </div>
              <div ref={detailScrollRef} className="flex-1 overflow-y-auto scrollbar-hide-on-idle">
                <NewsPlaceholderImage category={selectedNews.category} tall />
                <div className="p-4 flex flex-col gap-3">
                  <span className="text-[11px] text-gray-500">{formatDate(selectedNews.date)}</span>
                  <h2 className="text-base font-bold text-white leading-snug">{selectedNews.title}</h2>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">{selectedNews.excerpt}</p>
                  <div className="h-px bg-white/10" />
                  {selectedNews.body.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-sm text-gray-400 leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
