'use client';

import { useState } from 'react';
import { useModalA11y } from '@/lib/hooks/useModalA11y';
import { loadChartSettings, saveChartSettings, type ChartSettings } from '@/lib/chartSettings';
import { toast as showToast } from '@/stores/toast.store';

export function ChartSettingsModal({ onClose }: { onClose: () => void }) {
  const modalRef = useModalA11y(true, onClose, { focusFirstSelector: '[data-chart-settings-first]' });
  const [settings, setSettings] = useState<ChartSettings>(() => loadChartSettings());
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(settings.backgroundImage);

  // Обработка загрузки фонового изображения
  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setBackgroundImageFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setBackgroundImagePreview(dataUrl);
          setSettings(prev => ({ ...prev, backgroundImage: dataUrl }));
        };
        reader.readAsDataURL(file);
      } else {
        showToast('Пожалуйста, выберите файл изображения', 'warning');
      }
    }
  };

  // Удаление фонового изображения
  const handleRemoveBackgroundImage = () => {
    setBackgroundImageFile(null);
    setBackgroundImagePreview(null);
    setSettings(prev => ({ ...prev, backgroundImage: null }));
  };

  // Сохранение настроек
  const handleSave = () => {
    saveChartSettings(settings);
    // Перезагружаем страницу для применения настроек
    window.location.reload();
  };

  // Сброс к значениям по умолчанию
  const handleReset = () => {
    const defaultSettings: ChartSettings = {
      bullishColor: '#45b833',
      bearishColor: '#ff3d1f',
      backgroundImage: null,
      backgroundOpacity: 0.3,
      showCountdown: true,
      showGrid: true,
      showWatermark: true,
      timezoneOffset: 2,
    };
    setSettings(defaultSettings);
    setBackgroundImagePreview(null);
    setBackgroundImageFile(null);
    saveChartSettings(defaultSettings);
    window.location.reload();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-settings-title"
        aria-describedby="chart-settings-desc"
        className="bg-[#091C56] rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 id="chart-settings-title" className="text-sm font-semibold text-white">Настройки графика</h2>
            <p id="chart-settings-desc" className="sr-only">Настройте цвета свечей, сетку и другие параметры отображения</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 md:hover:text-white md:hover:bg-white/10 transition-colors"
            aria-label="Закрыть настройки графика"
            data-chart-settings-first
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Цвета свечей */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">Цвета свечей</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20">Бычья</span>
                <input
                  type="color"
                  value={settings.bullishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bullishColor: e.target.value }))}
                  className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={settings.bullishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bullishColor: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3347ff] focus:border-[#3347ff]"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20">Медвежья</span>
                <input
                  type="color"
                  value={settings.bearishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bearishColor: e.target.value }))}
                  className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={settings.bearishColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bearishColor: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3347ff] focus:border-[#3347ff]"
                />
              </div>
            </div>
          </div>

          {/* Фоновое изображение */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">Фоновое изображение</h3>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageChange}
                  className="hidden"
                />
                <span className="block px-4 py-2.5 rounded-lg bg-white/10 text-xs text-gray-300 md:hover:bg-white/15 cursor-pointer text-center border border-white/5 transition-colors">
                  {backgroundImagePreview ? 'Сменить изображение' : 'Загрузить изображение'}
                </span>
              </label>
              {backgroundImagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveBackgroundImage}
                  className="px-3 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-xs md:hover:bg-red-500/30 transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
            {backgroundImagePreview && (
              <div className="mt-3 flex items-center gap-3">
                <img src={backgroundImagePreview} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-1">Прозрачность {Math.round(settings.backgroundOpacity * 100)}%</div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.backgroundOpacity}
                    onChange={(e) => setSettings(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3347ff]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Отображение */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">Отображение</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/5 md:hover:bg-white/8 transition-colors">
                <span className="text-xs text-gray-300">Таймер и отсчёт до закрытия свечи</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showCountdown}
                  onClick={() => setSettings(prev => ({ ...prev, showCountdown: !prev.showCountdown }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    settings.showCountdown ? 'bg-[#3347ff]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.showCountdown ? 'translate-x-6 left-0.5' : 'translate-x-0 left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/5 md:hover:bg-white/8 transition-colors">
                <span className="text-xs text-gray-300">Сетка на графике</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showGrid}
                  onClick={() => setSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    settings.showGrid ? 'bg-[#3347ff]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.showGrid ? 'translate-x-6 left-0.5' : 'translate-x-0 left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/5 md:hover:bg-white/8 transition-colors">
                <span className="text-xs text-gray-300">Название пары на фоне</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showWatermark}
                  onClick={() => setSettings(prev => ({ ...prev, showWatermark: !prev.showWatermark }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    settings.showWatermark ? 'bg-[#3347ff]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.showWatermark ? 'translate-x-6 left-0.5' : 'translate-x-0 left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Часовой пояс */}
          <div>
            <h3 className="text-xs font-medium text-gray-300 mb-3">
              Часовой пояс — UTC{settings.timezoneOffset >= 0 ? '+' : ''}{settings.timezoneOffset}
            </h3>
            <input
              type="range"
              min="-12"
              max="14"
              step="1"
              value={settings.timezoneOffset}
              onChange={(e) => setSettings(prev => ({ ...prev, timezoneOffset: parseInt(e.target.value) }))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3347ff]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>UTC-12</span>
              <span>UTC+14</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-white/10 text-xs text-gray-400 md:hover:text-white md:hover:bg-white/15 transition-colors"
          >
            Сбросить
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 text-xs text-gray-400 md:hover:text-white md:hover:bg-white/15 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#3347ff] text-xs text-white font-medium md:hover:bg-[#3347ff]/90 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
