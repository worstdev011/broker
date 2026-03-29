'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useLocale, useTranslations } from 'next-intl';

type CatKey = 'forex' | 'crypto' | 'economy' | 'commodities' | 'analysis';
type NewsItem = {
  id: string;
  date: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  sentiment: { direction: 'up' | 'down'; strength: 1 | 2 | 3 };
};

const NEWS_META: Array<{
  id: string;
  date: string;
  catKey: CatKey;
  sentiment: { direction: 'up' | 'down'; strength: 1 | 2 | 3 };
}> = [
  { id: '1', date: '2026-03-18T10:30:00Z', catKey: 'forex', sentiment: { direction: 'up', strength: 2 } },
  { id: '2', date: '2026-03-18T09:15:00Z', catKey: 'crypto', sentiment: { direction: 'up', strength: 3 } },
  { id: '3', date: '2026-03-18T08:00:00Z', catKey: 'economy', sentiment: { direction: 'down', strength: 1 } },
  { id: '4', date: '2026-03-17T16:45:00Z', catKey: 'commodities', sentiment: { direction: 'down', strength: 2 } },
  { id: '5', date: '2026-03-17T14:20:00Z', catKey: 'commodities', sentiment: { direction: 'up', strength: 3 } },
  { id: '6', date: '2026-03-17T12:10:00Z', catKey: 'forex', sentiment: { direction: 'down', strength: 1 } },
  { id: '7', date: '2026-03-17T10:30:00Z', catKey: 'analysis', sentiment: { direction: 'up', strength: 1 } },
  { id: '8', date: '2026-03-17T08:15:00Z', catKey: 'crypto', sentiment: { direction: 'up', strength: 2 } },
];

function formatNewsDate(dateString: string, locale: string) {
  const date = new Date(dateString);
  const intlLocale = locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-GB';
  return new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function SentimentArrows({
  direction,
  strength,
  size = 'sm',
}: {
  direction: 'up' | 'down';
  strength: 1 | 2 | 3;
  size?: 'sm' | 'md';
}) {
  const isUp = direction === 'up';
  const color = isUp ? '#4ade80' : '#f87171';
  const w = size === 'md' ? 14 : 12;
  const h = size === 'md' ? 16 : 14;
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 3 }).map((_, i) => {
        const active = i < strength;
        return (
          <svg
            key={i}
            width={w}
            height={h}
            viewBox="0 0 10 12"
            fill="none"
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
    <div
      className={`w-full ${tall ? 'h-48' : 'h-32'} bg-gradient-to-br from-[#0d1e4a] to-[#1a2d5a] flex items-center justify-center relative overflow-hidden`}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(99,140,255,0.15) 24px,rgba(99,140,255,0.15) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(99,140,255,0.15) 24px,rgba(99,140,255,0.15) 25px)',
        }}
      />
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-20">
        <rect x="2" y="2" width="36" height="36" rx="4" stroke="white" strokeWidth="2" />
        <circle cx="14" cy="14" r="4" stroke="white" strokeWidth="2" />
        <path
          d="M2 28l10-8 8 6 8-10 10 8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute bottom-2 left-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
        {category}
      </span>
    </div>
  );
}

function NewsCard({ news, readMore, onClick }: { news: NewsItem; readMore: string; onClick: () => void }) {
  const locale = useLocale();
  return (
    <button type="button" onClick={onClick} className="w-full text-left bg-[#1f2a45] rounded-lg overflow-hidden group">
      <div className="relative">
        <NewsPlaceholderImage category={news.category} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium text-white">{readMore}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-white leading-snug">{news.title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{news.excerpt}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] text-gray-500">{formatNewsDate(news.date, locale)}</span>
          <SentimentArrows direction={news.sentiment.direction} strength={news.sentiment.strength} />
        </div>
      </div>
    </button>
  );
}

export function NewsModal({ onClose }: { onClose: () => void }) {
  void onClose;
  const tNews = useTranslations('newsArticles');
  const tTerm = useTranslations('terminal');
  const locale = useLocale();

  const items: NewsItem[] = useMemo(
    () =>
      NEWS_META.map((m) => ({
        id: m.id,
        date: m.date,
        sentiment: m.sentiment,
        category: tNews(`cat_${m.catKey}`),
        title: tNews(`item_${m.id}_title`),
        excerpt: tNews(`item_${m.id}_excerpt`),
        body: tNews(`item_${m.id}_body`),
      })),
    [tNews],
  );

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      c1();
      c2();
    };
  }, [selectedNews]);

  return (
    <div className="static h-full w-[330px] z-auto bg-[#0a1635] border-r border-white/10 shadow-2xl flex flex-col overflow-hidden">
      <div
        className="flex h-full min-h-0"
        style={{
          width: '200%',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          transform: showDetail ? 'translateX(-50%)' : 'translateX(0)',
        }}
      >
        <div className="flex flex-col min-h-0" style={{ width: '50%' }}>
          <div className="px-5 pt-4 shrink-0 border-b border-white/10">
            <div className="flex items-center justify-between gap-2 pb-3">
              <div className="text-sm font-medium text-white">{tTerm('news_feed_title')}</div>
            </div>
          </div>
          <div ref={listScrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-hide-on-idle">
            <div className="flex flex-col gap-3">
              {items.map((news) => (
                <NewsCard key={news.id} news={news} readMore={tTerm('news_read_more')} onClick={() => openDetail(news)} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col min-h-0" style={{ width: '50%' }}>
          {selectedNews && (
            <>
              <div className="px-4 pt-4 pb-3 shrink-0 border-b border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" weight="bold" />
                </button>
                <span className="text-sm font-medium text-white truncate min-w-0">{selectedNews.category}</span>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <SentimentArrows direction={selectedNews.sentiment.direction} strength={selectedNews.sentiment.strength} size="md" />
                </div>
              </div>
              <div ref={detailScrollRef} className="flex-1 overflow-y-auto scrollbar-hide-on-idle">
                <NewsPlaceholderImage category={selectedNews.category} tall />
                <div className="p-4 flex flex-col gap-3">
                  <span className="text-[11px] text-gray-500">{formatNewsDate(selectedNews.date, locale)}</span>
                  <h2 className="text-base font-bold text-white leading-snug">{selectedNews.title}</h2>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">{selectedNews.excerpt}</p>
                  <div className="h-px bg-white/10" />
                  {selectedNews.body.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-sm text-gray-400 leading-relaxed">
                      {paragraph}
                    </p>
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
