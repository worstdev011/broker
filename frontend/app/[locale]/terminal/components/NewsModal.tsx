'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

function NewsCard({ news, formatDate }: { news: any; formatDate: (date: string) => string }) {
  return (
    <div className="bg-[#1A253A] rounded-lg p-4 flex flex-col gap-3 md:hover:bg-[#1f2d47] transition-colors cursor-pointer">
      {/* Категория и дата */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#3347ff]">{news.category}</span>
        <span className="text-xs text-gray-400">{formatDate(news.date)}</span>
      </div>

      {/* Заголовок */}
      <h3 className="text-sm font-semibold text-white leading-tight">{news.title}</h3>

      {/* Краткое описание */}
      <p className="text-xs text-gray-300 leading-relaxed">{news.excerpt}</p>
    </div>
  );
}

export function NewsModal({ onClose }: { onClose: () => void }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Обработка скролла для показа скроллбара
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolling(true);
      scrollContainer.classList.add('scrolling');
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        scrollContainer.classList.remove('scrolling');
      }, 1000);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Dummy данные новостей
  const newsItems = [
    {
      id: '1',
      title: 'Рынок EUR/USD демонстрирует рост на фоне позитивных данных по инфляции',
      date: '2026-02-01T10:30:00Z',
      category: 'Форекс',
      excerpt: 'Европейская валюта укрепилась после публикации данных по инфляции в еврозоне, которые оказались лучше ожиданий аналитиков.',
    },
    {
      id: '2',
      title: 'Bitcoin достиг нового максимума: эксперты прогнозируют дальнейший рост',
      date: '2026-02-01T09:15:00Z',
      category: 'Криптовалюты',
      excerpt: 'Крупнейшая криптовалюта продолжает показывать впечатляющие результаты, привлекая внимание институциональных инвесторов.',
    },
    {
      id: '3',
      title: 'ФРС сохраняет текущую процентную ставку: влияние на валютные пары',
      date: '2026-02-01T08:00:00Z',
      category: 'Экономика',
      excerpt: 'Решение Федеральной резервной системы США оказало значительное влияние на динамику основных валютных пар.',
    },
    {
      id: '4',
      title: 'Нефть Brent: анализ технических уровней и прогнозы на неделю',
      date: '2026-01-31T16:45:00Z',
      category: 'Товары',
      excerpt: 'Аналитики рассматривают ключевые уровни поддержки и сопротивления для нефти марки Brent.',
    },
    {
      id: '5',
      title: 'Золото: безопасная гавань в условиях геополитической неопределенности',
      date: '2026-01-31T14:20:00Z',
      category: 'Товары',
      excerpt: 'Цены на золото продолжают расти на фоне усиления геополитической напряженности.',
    },
    {
      id: '6',
      title: 'GBP/USD: влияние Brexit на волатильность валютной пары',
      date: '2026-01-31T12:10:00Z',
      category: 'Форекс',
      excerpt: 'Британский фунт демонстрирует повышенную волатильность в связи с новыми переговорами по Brexit.',
    },
    {
      id: '7',
      title: 'Технический анализ: ключевые паттерны на графике USD/JPY',
      date: '2026-01-31T10:30:00Z',
      category: 'Анализ',
      excerpt: 'Эксперты выделяют важные технические уровни и паттерны для торговой пары USD/JPY.',
    },
    {
      id: '8',
      title: 'Криптовалютный рынок: обзор альткоинов и их потенциала роста',
      date: '2026-01-31T08:15:00Z',
      category: 'Криптовалюты',
      excerpt: 'Анализ перспективных альткоинов и их потенциала для инвестиций в текущем рыночном цикле.',
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  };

  return (
    <div
      className="fixed left-0 md:left-[88px] top-[65px] bottom-[max(4.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] md:bottom-0 md:h-[calc(100vh-65px)] z-50 w-full md:w-[340px] bg-[#0a1635] border-r border-white/10 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Новости</h2>
          <p className="text-xs text-gray-400 mt-0.5">Актуальные события финансового рынка</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 md:hover:text-white md:hover:bg-white/10 transition-colors"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-5 scrollbar-hide-on-idle"
      >
        <div className="flex flex-col gap-4">
          {newsItems.map((news) => (
            <NewsCard key={news.id} news={news} formatDate={formatDate} />
          ))}
        </div>
      </div>
    </div>
  );
}
