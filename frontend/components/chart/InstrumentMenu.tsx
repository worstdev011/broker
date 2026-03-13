/**
 * InstrumentMenu — выпадающее меню для выбора валютной пары
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useLocalStorageSet } from '@/lib/hooks/useLocalStorageSet';
import { ChevronDown, ChevronUp, Search, Star } from 'lucide-react';
import { INSTRUMENTS, getInstrumentOrDefault } from '@/lib/instruments';
import { api } from '@/lib/api/api';
import { logger } from '@/lib/logger';
import ReactCountryFlag from 'react-country-flag';

/**
 * Получает коды стран для валютной пары (ISO 3166-1 alpha-2)
 * Возвращает массив из двух кодов стран
 */
function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  // Извлекаем валюты из пары (например, "EUR/USD" -> ["EUR", "USD"])
  const parts = pair.split('/');
  if (parts.length !== 2) return [null, null];
  
  const [base, quote] = parts;
  
  // Маппинг валют на коды стран (ISO 3166-1 alpha-2)
  const currencyToCountry: Record<string, string> = {
    'EUR': 'EU', // Европейский союз
    'USD': 'US', // США
    'GBP': 'GB', // Великобритания
    'JPY': 'JP', // Япония
    'AUD': 'AU', // Австралия
    'CAD': 'CA', // Канада
    'CHF': 'CH', // Швейцария
    'NZD': 'NZ', // Новая Зеландия
    'NOK': 'NO', // Норвегия
    'UAH': 'UA', // Украина
    'BTC': 'US', // Bitcoin (используем США как условный)
    'ETH': 'US', // Ethereum (используем США как условный)
    'SOL': 'US', // Solana (используем США как условный)
    'BNB': 'US', // BNB (используем США как условный)
  };
  
  return [
    currencyToCountry[base] || null,
    currencyToCountry[quote] || null,
  ];
}

interface InstrumentMenuProps {
  instrument: string;
  onInstrumentChange: (instrument: string) => void;
}

type Category = 'favorites' | 'all' | 'forex' | 'crypto' | 'otc';

type SortOrder = 'asc' | 'desc' | null;

/** REAL-пары закрыты в выходные (суббота, воскресенье). OTC работают 24/7. */
function isInstrumentClosed(inst: { id: string }): boolean {
  if (inst.id.endsWith('_OTC')) return false;
  if (inst.id.endsWith('_REAL')) {
    const day = new Date().getDay(); // 0 = воскресенье, 6 = суббота
    return day === 0 || day === 6;
  }
  return false;
}

export function InstrumentMenu({ instrument, onInstrumentChange }: InstrumentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isScrolling, setIsScrolling] = useState(false);
  const [favorites, toggleFavorite] = useLocalStorageSet('instrument-menu-favorites');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 🔥 FLOW I-PAYOUT: Загружаем payoutPercent для всех инструментов
  const [instrumentsData, setInstrumentsData] = useState<Array<{ id: string; payoutPercent: number }>>([]);

  // Загружаем данные инструментов с payoutPercent
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        const data = await api<Array<{ id: string; payoutPercent: number }>>('/api/instruments');
        setInstrumentsData(data);
      } catch (error) {
        logger.error('Failed to load instruments:', error);
      }
    };
    loadInstruments();
  }, []);

  useClickOutside(menuRef, () => { setIsOpen(false); setSearchQuery(''); }, isOpen);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      setSortOrder((prev) => prev ?? 'desc');
    } else {
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Определяем категорию инструмента по ID (суффиксы _OTC, _REAL)
  const getInstrumentCategory = (inst: { id: string; label: string }): Category => {
    if (inst.id.includes('BTC') || inst.id.includes('ETH') || inst.id.includes('SOL') || inst.id.includes('BNB')) {
      return 'crypto';
    }
    if (inst.id.endsWith('_OTC')) {
      return 'otc';
    }
    if (inst.id.endsWith('_REAL')) {
      return 'forex';
    }
    return 'forex';
  };

  // Фильтруем инструменты по категории и поисковому запросу
  let filteredInstruments = INSTRUMENTS.filter((inst) => {
    // Вкладка «Избранные» — только отмеченные звездочкой
    if (selectedCategory === 'favorites') {
      if (!favorites.has(inst.id)) return false;
    } else if (selectedCategory !== 'all') {
      const category = getInstrumentCategory(inst);
      if (category !== selectedCategory) {
        return false;
      }
    }
    // Фильтр по поисковому запросу
    return inst.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Сортируем по доходности если выбрана сортировка
  if (sortOrder !== null) {
    filteredInstruments = [...filteredInstruments].sort((a, b) => {
      const payoutA = instrumentsData.find((data) => data.id === a.id)?.payoutPercent ?? 75;
      const payoutB = instrumentsData.find((data) => data.id === b.id)?.payoutPercent ?? 75;
      return sortOrder === 'asc' ? payoutA - payoutB : payoutB - payoutA;
    });
  }
  // Закрытые пары — в самый низ списка
  filteredInstruments = [...filteredInstruments].sort((a, b) => {
    const closedA = isInstrumentClosed(a);
    const closedB = isInstrumentClosed(b);
    if (closedA === closedB) return 0;
    return closedA ? 1 : -1;
  });

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
  }, [isOpen]);

  const currentInstrument = getInstrumentOrDefault(instrument);
  const displayLabel = currentInstrument.label;
  // 🔥 FLOW I-PAYOUT: Получаем payoutPercent для текущего инструмента
  const currentPayout = instrumentsData.find((inst) => inst.id === instrument)?.payoutPercent ?? 75;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-300 ease-in-out flex items-center gap-2 text-white md:hover:bg-white/10"
        style={{ height: '36px', minHeight: '36px', maxHeight: '36px' }}
      >
        {/* Флаги валют */}
        <div className="flex items-center">
          {(() => {
            const [country1, country2] = getCurrencyCountryCodes(displayLabel.split(' ')[0]); // BASE/QUOTE часть без "OTC"/"Real"
            return (
              <>
                {country1 && (
                  <div className="w-4 h-4 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center relative z-0">
                    <ReactCountryFlag
                      countryCode={country1}
                      svg
                      style={{
                        width: '16px',
                        height: '16px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      title={country1}
                    />
                  </div>
                )}
                {country2 && (
                  <div className="w-4 h-4 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center relative z-10 -ml-2">
                    <ReactCountryFlag
                      countryCode={country2}
                      svg
                      style={{
                        width: '16px',
                        height: '16px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      title={country2}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <span>{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 rounded-lg shadow-xl w-[380px] max-h-[500px] flex flex-col z-50 overflow-hidden bg-[#1e2a40] border border-white/5">
          {/* Фильтры по категориям */}
          <div className="border-b border-white/10 px-4 py-2.5 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategory('favorites')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors duration-300 ease-in-out flex items-center ${
                selectedCategory === 'favorites'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
              title="Избранные"
            >
              <Star className={`w-4 h-4 shrink-0 ${favorites.size > 0 ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300 ease-in-out ${
                selectedCategory === 'all'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('forex')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300 ease-in-out ${
                selectedCategory === 'forex'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              Форекс
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('crypto')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300 ease-in-out ${
                selectedCategory === 'crypto'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              Крипто
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('otc')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300 ease-in-out ${
                selectedCategory === 'otc'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              OTC
            </button>
          </div>
          {/* Поле поиска */}
          <div className="border-b border-white/10 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-1.5 text-sm bg-white/10 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-white/10 md:hover:border-white/15 transition-colors duration-300 ease-in-out"
              />
            </div>
          </div>
          {/* Заголовок модалки */}
          <div className="border-b border-white/10 px-4 py-2 flex items-center justify-between">
            <span className="text-gray-300 font-semibold text-sm">Актив</span>
            <button
              type="button"
              onClick={() => {
                if (sortOrder === null) {
                  setSortOrder('desc');
                } else if (sortOrder === 'desc') {
                  setSortOrder('asc');
                } else {
                  setSortOrder(null);
                }
              }}
              className="flex items-center gap-1 md:hover:opacity-80 transition-opacity duration-200 ease-in-out"
            >
              <span className="text-gray-300 font-semibold text-sm">Выплата</span>
              {sortOrder === 'desc' ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
              ) : sortOrder === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-300 opacity-50" />
              )}
            </button>
          </div>
          {/* Список инструментов */}
          <div 
            ref={scrollContainerRef}
            className="p-2.5 overflow-y-auto flex-1 scrollbar-hide-on-idle"
          >
            {filteredInstruments.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">
                {selectedCategory === 'favorites'
                  ? 'Нет избранных пар.'
                  : 'Ничего не найдено'}
              </div>
            ) : (
              filteredInstruments.map((inst) => {
              const isActive = instrument === inst.id;
              const displayName = inst.label;
              const isDisabled = isInstrumentClosed(inst);
              // 🔥 FLOW I-PAYOUT: Получаем payoutPercent для этого инструмента
              const payout = instrumentsData.find((data) => data.id === inst.id)?.payoutPercent ?? 75;
              return (
                <button
                  key={inst.id}
                  type="button"
                  aria-disabled={isDisabled}
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => {
                    if (isDisabled) return;
                    onInstrumentChange(inst.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors duration-300 ease-in-out duration-300 ease-in-out ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed text-gray-500'
                      : isActive
                        ? 'bg-[#3347FF] text-white'
                        : 'text-gray-300 md:hover:bg-white/10 md:hover:text-white'
                  }`}
                  title={isDisabled ? `${inst.label} — закрыто на выходных` : inst.label}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Иконка избранного */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(inst.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(inst.id);
                        }
                      }}
                      className="flex-shrink-0 p-0.5 md:hover:bg-white/10 rounded transition-colors duration-300 ease-in-out cursor-pointer"
                      title={favorites.has(inst.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 transition-colors duration-300 ease-in-out ${
                          favorites.has(inst.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400 md:hover:text-yellow-400'
                        }`}
                      />
                    </span>
                    {/* Флаги валют */}
                    <div className="flex items-center">
                      {(() => {
                        const [country1, country2] = getCurrencyCountryCodes(displayName.split(' ')[0]); // BASE/QUOTE часть
                        return (
                          <>
                            {country1 && (
                              <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center relative z-0">
                                <ReactCountryFlag
                                  countryCode={country1}
                                  svg
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                  title={country1}
                                />
                              </div>
                            )}
                            {country2 && (
                              <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center relative z-10 -ml-2.5">
                                <ReactCountryFlag
                                  countryCode={country2}
                                  svg
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                  title={country2}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <span className="font-medium">{displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 text-right">
                      {isDisabled ? 'N/A' : `+${payout}%`}
                    </span>
                  </div>
                </button>
              );
            })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
