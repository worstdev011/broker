/**
 * InstrumentMenu - выпадающее меню для выбора валютной пары
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useLocalStorageSet } from '@/lib/hooks/useLocalStorageSet';
import { CaretDown, CaretUp, MagnifyingGlass, Star } from '@phosphor-icons/react';
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
  const t = useTranslations('terminal');
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
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
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

  const TEXT_TABS = useMemo(
    () =>
      [
        { key: 'all' as const, label: t('instr_tab_all') },
        { key: 'forex' as const, label: t('instr_tab_forex') },
        { key: 'crypto' as const, label: t('instr_tab_crypto') },
        { key: 'otc' as const, label: t('instr_tab_otc') },
      ],
    [t],
  );

  useEffect(() => {
    const idx = TEXT_TABS.findIndex((tab) => tab.key === selectedCategory);
    if (idx === -1) return;
    const btn = tabButtonRefs.current[idx];
    if (!btn) return;
    setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [selectedCategory, TEXT_TABS]);

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
    // Вкладка «Избранные» - только отмеченные звездочкой
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
  // Закрытые пары - в самый низ списка
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
                  <div className="w-5 h-5 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 relative z-0">
                    <ReactCountryFlag
                      countryCode={country1}
                      svg
                      className="!block !h-full !w-full !min-h-full !min-w-full rounded-full object-cover object-center scale-[1.2]"
                      title={country1}
                    />
                  </div>
                )}
                {country2 && (
                  <div className="w-5 h-5 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 relative z-10 -ml-2">
                    <ReactCountryFlag
                      countryCode={country2}
                      svg
                      className="!block !h-full !w-full !min-h-full !min-w-full rounded-full object-cover object-center scale-[1.2]"
                      title={country2}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <span>{displayLabel}</span>
        <CaretDown
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          weight="bold"
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 md:mt-2 rounded-lg shadow-xl w-[min(calc(100vw-1rem),300px)] max-h-[min(42vh,340px)] md:w-[380px] md:max-h-[500px] flex flex-col z-50 overflow-hidden bg-[#1e2a40] border border-white/5">
          {/* Фильтры по категориям */}
          <div className="px-2 md:px-4 flex items-center gap-1.5 md:gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Звезда - избранное */}
            <button
              type="button"
              onClick={() => setSelectedCategory('favorites')}
              className="flex items-center py-2 md:py-2.5 shrink-0"
              style={{ color: selectedCategory === 'favorites' ? '#fbbf24' : 'rgba(255,255,255,0.4)', transition: 'color 150ms ease' }}
              title={t('instr_favorites_star')}
            >
              <Star className={`w-4 h-4 shrink-0 ${favorites.size > 0 || selectedCategory === 'favorites' ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>

            {/* Разделитель */}
            <div className="w-px h-3.5 md:h-4 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Текстовые табы с скользящим индикатором */}
            <div ref={tabContainerRef} className="relative flex items-center min-w-0 flex-1 overflow-x-auto scrollbar-hide-on-idle">
              {TEXT_TABS.map((tab, idx) => (
                <button
                  key={tab.key}
                  ref={el => { tabButtonRefs.current[idx] = el; }}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className="px-2 py-2 md:px-3 md:py-2.5 text-xs md:text-sm bg-transparent border-0 outline-none cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    color: selectedCategory === tab.key ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontWeight: selectedCategory === tab.key ? 600 : 400,
                    transition: 'color 150ms ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
              {/* Sliding underline indicator */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: tabIndicator.left,
                  width: tabIndicator.width,
                  height: '2px',
                  borderRadius: '2px',
                  background: '#2478ff',
                  opacity: selectedCategory === 'favorites' ? 0 : 1,
                  transition: 'left 200ms ease, width 200ms ease, opacity 150ms ease',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
          {/* Поле поиска */}
          <div className="border-b border-white/10 px-2 py-2 md:px-4 md:py-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('instr_search')}
                className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-1 md:py-1.5 text-xs md:text-sm bg-white/10 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-white/10 md:hover:border-white/15 transition-colors duration-300 ease-in-out"
              />
            </div>
          </div>
          {/* Заголовок модалки */}
          <div className="border-b border-white/10 px-2 py-1.5 md:px-4 md:py-2 flex items-center justify-between">
            <span className="text-gray-300 font-semibold text-xs md:text-sm">{t('instr_column_asset')}</span>
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
              <span className="text-gray-300 font-semibold text-xs md:text-sm">{t('instr_column_payout')}</span>
              {sortOrder === 'desc' ? (
                <CaretDown className="w-3.5 h-3.5 text-gray-300" weight="bold" />
              ) : sortOrder === 'asc' ? (
                <CaretUp className="w-3.5 h-3.5 text-gray-300" weight="bold" />
              ) : (
                <CaretDown className="w-3.5 h-3.5 text-gray-300 opacity-50" weight="bold" />
              )}
            </button>
          </div>
          {/* Список инструментов */}
          <div 
            ref={scrollContainerRef}
            className="p-1.5 md:p-2.5 overflow-y-auto flex-1 min-h-0 scrollbar-hide-on-idle"
          >
            {filteredInstruments.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">
                {selectedCategory === 'favorites' ? t('instr_no_favorites') : t('instr_no_results')}
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
                  className={`w-full flex items-center justify-between gap-1.5 md:gap-2 py-1.5 md:py-2 rounded-lg text-left text-xs md:text-sm transition-colors duration-300 ease-in-out ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed text-gray-500'
                      : isActive
                        ? 'text-white'
                        : 'text-gray-300 md:hover:bg-white/10 md:hover:text-white'
                  }`}
                  style={isActive ? {
                    borderLeft: '3px solid #2478ff',
                    background: 'rgba(36,120,255,0.08)',
                    paddingLeft: '9px',
                    paddingRight: '12px',
                  } : { paddingLeft: '12px', paddingRight: '12px' }}
                  title={isDisabled ? t('instr_closed_weekend', { label: inst.label }) : inst.label}
                >
                  <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
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
                      title={favorites.has(inst.id) ? t('fav_remove') : t('fav_add')}
                    >
                      <Star
                        className={`w-3.5 h-3.5 max-md:w-3 max-md:h-3 transition-colors duration-300 ease-in-out ${
                          favorites.has(inst.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-500 hover:text-yellow-400'
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
                              <div className="w-7 h-7 max-md:w-6 max-md:h-6 rounded-full overflow-hidden border border-white/70 md:border-2 flex-shrink-0 relative z-0">
                                <ReactCountryFlag
                                  countryCode={country1}
                                  svg
                                  className="!block !h-full !w-full !min-h-full !min-w-full rounded-full object-cover object-center scale-[1.18]"
                                  title={country1}
                                />
                              </div>
                            )}
                            {country2 && (
                              <div className="w-7 h-7 max-md:w-6 max-md:h-6 rounded-full overflow-hidden border border-white/70 md:border-2 flex-shrink-0 relative z-10 -ml-2.5 md:-ml-3">
                                <ReactCountryFlag
                                  countryCode={country2}
                                  svg
                                  className="!block !h-full !w-full !min-h-full !min-w-full rounded-full object-cover object-center scale-[1.18]"
                                  title={country2}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <span className="font-medium truncate">{displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] md:text-xs font-medium text-right shrink-0"
                      style={{ color: isDisabled ? 'rgba(255,255,255,0.3)' : '#00d084' }}
                    >
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
