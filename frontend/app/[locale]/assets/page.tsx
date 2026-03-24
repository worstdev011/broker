'use client'

import Image from 'next/image'
import { Link } from '@/components/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import ReactCountryFlag from 'react-country-flag'
import { useAuth } from '@/lib/hooks/useAuth'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'
import { AuthSlidePanel } from '@/components/AuthSlidePanel'
import { ScrollToTop } from '@/components/ScrollToTop'

function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  const parts = pair.split('/')
  if (parts.length !== 2) return [null, null]
  const [base, quote] = parts
  const baseClean = base?.replace(/\s+OTC$/i, '')?.trim() || base
  const quoteClean = quote?.replace(/\s+OTC$/i, '')?.trim() || quote
  const currencyToCountry: Record<string, string> = {
    EUR: 'EU', USD: 'US', GBP: 'GB', JPY: 'JP', AUD: 'AU', CAD: 'CA', CHF: 'CH', NZD: 'NZ', NOK: 'NO', UAH: 'UA',
    SGD: 'SG', HKD: 'HK', CNH: 'CN', ZAR: 'ZA', MXN: 'MX', TRY: 'TR', RUB: 'RU', INR: 'IN', KRW: 'KR', BRL: 'BR',
    PLN: 'PL', SEK: 'SE', DKK: 'DK', BTC: 'US', ETH: 'US', SOL: 'US', ADA: 'US', BNB: 'US',
  }
  return [currencyToCountry[baseClean] || null, currencyToCountry[quoteClean] || null]
}

export default function AssetsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const t = useTranslations('assets')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader
        activeNav="assets"
        onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
        onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
      />

      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-6 md:px-8 relative z-10 pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label={t('breadcrumb_aria')}>
                <Link href="/" className="hover:text-white transition-colors">{t('breadcrumb_home')}</Link>
                <span className="text-gray-500">→</span>
                <span className="text-white">{t('title')}</span>
              </nav>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">{t('title')}</h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-4">{t('title')}</h2>
          <p className="text-base md:text-lg text-gray-600 text-center max-w-2xl mx-auto mb-12">
            {t('section_desc')}
          </p>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 md:px-6 font-semibold text-gray-800">{t('table_name')}</th>
                    <th className="text-left py-4 px-4 md:px-6 font-semibold text-gray-800">{t('table_price')}</th>
                    <th className="text-left py-4 px-4 md:px-6 font-semibold text-gray-800">{t('table_volume')}</th>
                    <th className="text-left py-4 px-4 md:px-6 font-semibold text-gray-800">{t('table_yield')}</th>
                    <th className="text-left py-4 px-4 md:px-6 font-semibold text-gray-800">{t('table_hours')}</th>
                    <th className="text-left py-4 px-4 md:px-6 font-semibold text-gray-800">{t('table_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    // Major Forex Pairs
                    { name: 'EUR/USD', ticker: 'EUR/USD', color: '#3347ff', letter: '€', price: '1.0856', mcap: '-', volume: '$2,456,789,012' },
                    { name: 'GBP/USD', ticker: 'GBP/USD', color: '#3347ff', letter: '£', price: '1.2645', mcap: '-', volume: '$1,234,567,890' },
                    { name: 'USD/JPY', ticker: 'USD/JPY', color: '#3347ff', letter: '¥', price: '149.23', mcap: '-', volume: '$3,567,890,123' },
                    { name: 'USD/CHF', ticker: 'USD/CHF', color: '#3347ff', letter: '₣', price: '0.8765', mcap: '-', volume: '$987,654,321' },
                    { name: 'AUD/USD', ticker: 'AUD/USD', color: '#3347ff', letter: 'A$', price: '0.6543', mcap: '-', volume: '$1,123,456,789' },
                    { name: 'USD/CAD', ticker: 'USD/CAD', color: '#3347ff', letter: 'C$', price: '1.3456', mcap: '-', volume: '$876,543,210' },
                    { name: 'NZD/USD', ticker: 'NZD/USD', color: '#3347ff', letter: 'NZ$', price: '0.6123', mcap: '-', volume: '$654,321,098' },
                    { name: 'EUR/GBP', ticker: 'EUR/GBP', color: '#3347ff', letter: '€', price: '0.8587', mcap: '-', volume: '$543,210,987' },
                    { name: 'EUR/JPY', ticker: 'EUR/JPY', color: '#3347ff', letter: '€', price: '161.89', mcap: '-', volume: '$432,109,876' },
                    { name: 'GBP/JPY', ticker: 'GBP/JPY', color: '#3347ff', letter: '£', price: '188.65', mcap: '-', volume: '$321,098,765' },
                    { name: 'EUR/CHF', ticker: 'EUR/CHF', color: '#3347ff', letter: '€', price: '0.9512', mcap: '-', volume: '$210,987,654' },
                    { name: 'AUD/JPY', ticker: 'AUD/JPY', color: '#3347ff', letter: 'A$', price: '97.65', mcap: '-', volume: '$109,876,543' },
                    { name: 'CAD/JPY', ticker: 'CAD/JPY', color: '#3347ff', letter: 'C$', price: '110.87', mcap: '-', volume: '$198,765,432' },
                    { name: 'CHF/JPY', ticker: 'CHF/JPY', color: '#3347ff', letter: '₣', price: '170.23', mcap: '-', volume: '$287,654,321' },
                    { name: 'EUR/AUD', ticker: 'EUR/AUD', color: '#3347ff', letter: '€', price: '1.6589', mcap: '-', volume: '$376,543,210' },
                    { name: 'GBP/AUD', ticker: 'GBP/AUD', color: '#3347ff', letter: '£', price: '1.9321', mcap: '-', volume: '$465,432,109' },
                    { name: 'EUR/CAD', ticker: 'EUR/CAD', color: '#3347ff', letter: '€', price: '1.4608', mcap: '-', volume: '$554,321,098' },
                    { name: 'GBP/CAD', ticker: 'GBP/CAD', color: '#3347ff', letter: '£', price: '1.7023', mcap: '-', volume: '$643,210,987' },
                    { name: 'AUD/CAD', ticker: 'AUD/CAD', color: '#3347ff', letter: 'A$', price: '0.8809', mcap: '-', volume: '$732,109,876' },
                    { name: 'NZD/JPY', ticker: 'NZD/JPY', color: '#3347ff', letter: 'NZ$', price: '91.45', mcap: '-', volume: '$821,098,765' },
                    { name: 'USD/SGD', ticker: 'USD/SGD', color: '#3347ff', letter: 'S$', price: '1.3456', mcap: '-', volume: '$910,987,654' },
                    { name: 'USD/HKD', ticker: 'USD/HKD', color: '#3347ff', letter: 'HK$', price: '7.8123', mcap: '-', volume: '$1,009,876,543' },
                    { name: 'USD/CNH', ticker: 'USD/CNH', color: '#3347ff', letter: '¥', price: '7.2345', mcap: '-', volume: '$1,098,765,432' },
                    { name: 'USD/ZAR', ticker: 'USD/ZAR', color: '#3347ff', letter: 'R', price: '18.6543', mcap: '-', volume: '$1,187,654,321' },
                    { name: 'USD/MXN', ticker: 'USD/MXN', color: '#3347ff', letter: '$', price: '17.0123', mcap: '-', volume: '$1,276,543,210' },
                    { name: 'USD/TRY', ticker: 'USD/TRY', color: '#3347ff', letter: '₺', price: '32.4567', mcap: '-', volume: '$1,365,432,109' },
                    { name: 'EUR/TRY', ticker: 'EUR/TRY', color: '#3347ff', letter: '€', price: '35.2345', mcap: '-', volume: '$1,454,321,098' },
                    { name: 'GBP/TRY', ticker: 'GBP/TRY', color: '#3347ff', letter: '£', price: '41.0123', mcap: '-', volume: '$1,543,210,987' },
                    { name: 'USD/RUB', ticker: 'USD/RUB', color: '#3347ff', letter: '₽', price: '92.3456', mcap: '-', volume: '$1,632,109,876' },
                    { name: 'EUR/RUB', ticker: 'EUR/RUB', color: '#3347ff', letter: '€', price: '100.2345', mcap: '-', volume: '$1,721,098,765' },
                    { name: 'USD/INR', ticker: 'USD/INR', color: '#3347ff', letter: '₹', price: '83.1234', mcap: '-', volume: '$1,810,987,654' },
                    { name: 'USD/KRW', ticker: 'USD/KRW', color: '#3347ff', letter: '₩', price: '1,312.45', mcap: '-', volume: '$1,909,876,543' },
                    { name: 'USD/BRL', ticker: 'USD/BRL', color: '#3347ff', letter: 'R$', price: '4.9876', mcap: '-', volume: '$2,008,765,432' },
                    { name: 'EUR/PLN', ticker: 'EUR/PLN', color: '#3347ff', letter: '€', price: '4.3456', mcap: '-', volume: '$2,107,654,321' },
                    { name: 'EUR/SEK', ticker: 'EUR/SEK', color: '#3347ff', letter: '€', price: '11.2345', mcap: '-', volume: '$2,206,543,210' },
                    { name: 'EUR/NOK', ticker: 'EUR/NOK', color: '#3347ff', letter: '€', price: '11.5678', mcap: '-', volume: '$2,305,432,109' },
                    { name: 'EUR/DKK', ticker: 'EUR/DKK', color: '#3347ff', letter: '€', price: '7.4567', mcap: '-', volume: '$2,404,321,098' },
                    { name: 'GBP/NZD', ticker: 'GBP/NZD', color: '#3347ff', letter: '£', price: '2.0645', mcap: '-', volume: '$2,503,210,987' },
                    { name: 'AUD/NZD', ticker: 'AUD/NZD', color: '#3347ff', letter: 'A$', price: '1.0687', mcap: '-', volume: '$2,602,109,876' },
                    { name: 'EUR/NZD', ticker: 'EUR/NZD', color: '#3347ff', letter: '€', price: '1.7723', mcap: '-', volume: '$2,701,098,765' },
                    // Cryptocurrencies
                    { name: 'Bitcoin', ticker: 'BTC', color: '#f7931a', letter: 'B', price: '$47,585.27', mcap: '$894,726,598,207', volume: '$36,896,174,657' },
                    { name: 'Ethereum', ticker: 'ETH', color: '#627eea', letter: 'E', price: '$2,512.44', mcap: '$302,118,456,789', volume: '$18,234,567,890' },
                    { name: 'Cardano', ticker: 'ADA', color: '#0033ad', letter: 'A', price: '$0.58', mcap: '$20,445,678,901', volume: '$1,234,567,890' },
                    { name: 'Solana', ticker: 'SOL', color: '#9945ff', letter: 'S', price: '$98.72', mcap: '$42,123,456,789', volume: '$3,456,789,012' },
                    // OTC пары
                    { name: 'EUR/USD OTC', ticker: 'EUR/USD OTC', color: '#3347ff', letter: '€', price: '1.0856', mcap: '-', volume: '$2,456,789,012' },
                    { name: 'GBP/USD OTC', ticker: 'GBP/USD OTC', color: '#3347ff', letter: '£', price: '1.2645', mcap: '-', volume: '$1,234,567,890' },
                    { name: 'USD/CAD OTC', ticker: 'USD/CAD OTC', color: '#3347ff', letter: 'C$', price: '1.3456', mcap: '-', volume: '$876,543,210' },
                    { name: 'USD/CHF OTC', ticker: 'USD/CHF OTC', color: '#3347ff', letter: '₣', price: '0.8765', mcap: '-', volume: '$987,654,321' },
                    { name: 'AUD/CAD OTC', ticker: 'AUD/CAD OTC', color: '#3347ff', letter: 'A$', price: '0.8809', mcap: '-', volume: '$732,109,876' },
                    { name: 'AUD/CHF OTC', ticker: 'AUD/CHF OTC', color: '#3347ff', letter: 'A$', price: '0.57', mcap: '-', volume: '$654,321,098' },
                    { name: 'CAD/JPY OTC', ticker: 'CAD/JPY OTC', color: '#3347ff', letter: 'C$', price: '110.87', mcap: '-', volume: '$198,765,432' },
                    { name: 'EUR/JPY OTC', ticker: 'EUR/JPY OTC', color: '#3347ff', letter: '€', price: '161.89', mcap: '-', volume: '$432,109,876' },
                    { name: 'GBP/JPY OTC', ticker: 'GBP/JPY OTC', color: '#3347ff', letter: '£', price: '188.65', mcap: '-', volume: '$321,098,765' },
                    { name: 'NZD/USD OTC', ticker: 'NZD/USD OTC', color: '#3347ff', letter: 'NZ$', price: '0.6123', mcap: '-', volume: '$654,321,098' },
                    { name: 'NZD/JPY OTC', ticker: 'NZD/JPY OTC', color: '#3347ff', letter: 'NZ$', price: '91.45', mcap: '-', volume: '$821,098,765' },
                    { name: 'EUR/CHF OTC', ticker: 'EUR/CHF OTC', color: '#3347ff', letter: '€', price: '0.9512', mcap: '-', volume: '$210,987,654' },
                    { name: 'EUR/NZD OTC', ticker: 'EUR/NZD OTC', color: '#3347ff', letter: '€', price: '1.7723', mcap: '-', volume: '$2,701,098,765' },
                    { name: 'GBP/AUD OTC', ticker: 'GBP/AUD OTC', color: '#3347ff', letter: '£', price: '1.9321', mcap: '-', volume: '$465,432,109' },
                    { name: 'CHF/NOK OTC', ticker: 'CHF/NOK OTC', color: '#3347ff', letter: '₣', price: '12.00', mcap: '-', volume: '$543,210,987' },
                    { name: 'UAH/USD OTC', ticker: 'UAH/USD OTC', color: '#3347ff', letter: '₴', price: '0.025', mcap: '-', volume: '$321,098,765' },
                    { name: 'Bitcoin OTC', ticker: 'BTC/USD OTC', color: '#f7931a', letter: 'B', price: '$47,585.27', mcap: '-', volume: '$36,896,174,657' },
                    { name: 'Ethereum OTC', ticker: 'ETH/USD OTC', color: '#627eea', letter: 'E', price: '$2,512.44', mcap: '-', volume: '$18,234,567,890' },
                    { name: 'Solana OTC', ticker: 'SOL/USD OTC', color: '#9945ff', letter: 'S', price: '$98.72', mcap: '-', volume: '$3,456,789,012' },
                    { name: 'BNB OTC', ticker: 'BNB/USD OTC', color: '#f3ba2f', letter: 'B', price: '$312.45', mcap: '-', volume: '$1,234,567,890' },
                  ].map((asset) => (
                    <tr key={asset.ticker} className="border-b border-gray-200 last:border-b-0">
                      <td className="py-4 px-4 md:px-6">
                        <div className="flex items-center gap-3">
                          {asset.ticker.includes('/') ? (
                            <div className="flex items-center">
                              {(() => {
                                const [country1, country2] = getCurrencyCountryCodes(asset.ticker)
                                return (
                                  <>
                                    {country1 && (
                                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 flex items-center justify-center">
                                        <ReactCountryFlag
                                          countryCode={country1}
                                          svg
                                          style={{ width: '40px', height: '40px', objectFit: 'cover', display: 'block' }}
                                          title={country1}
                                        />
                                      </div>
                                    )}
                                    {country2 && (
                                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 flex items-center justify-center -ml-2.5 relative z-10">
                                        <ReactCountryFlag
                                          countryCode={country2}
                                          svg
                                          style={{ width: '40px', height: '40px', objectFit: 'cover', display: 'block' }}
                                          title={country2}
                                        />
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: asset.color }}>{asset.letter}</div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{asset.name}</span>
                            {asset.name !== asset.ticker && (
                              <span className="text-sm text-gray-500">{asset.ticker}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6 text-gray-900">{asset.price}</td>
                      <td className="py-4 px-4 md:px-6 text-gray-900">{asset.volume}</td>
                      <td className="py-4 px-4 md:px-6">
                        <span className="text-green-600 font-semibold">90%</span>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <span className="text-gray-700 font-medium">{t('trading_hours')}</span>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        {!isLoading && isAuthenticated ? (
                          <Link href="/terminal" className="inline-flex items-center gap-1.5 text-[#3347ff] hover:text-[#2a3ae6] font-medium transition-colors">
                            {t('open_chart')}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </Link>
                        ) : (
                          <button
                            onClick={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
                            className="inline-flex items-center gap-1.5 text-[#3347ff] hover:text-[#2a3ae6] font-medium transition-colors"
                          >
                            {t('open_chart')}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <AuthSlidePanel open={showRegisterPanel} onClose={() => setShowRegisterPanel(false)} initialMode={panelMode} />

      <Footer />

      <ScrollToTop />
    </div>
  )
}
