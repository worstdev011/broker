/**
 * FLOW T5 - Format Server Time (Pure Function)
 * Только входной ts, без Date.now(). Пример: "19:45:02 UTC+2"
 * offsetMinutes = -date.getTimezoneOffset() (клиентский offset: положительный = восток)
 * Теперь использует настройки часового пояса из chartSettings
 */

import { getChartSettings } from '@/lib/chartSettings';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatServerTime(ts: number, offsetMinutes: number): string {
  const settings = getChartSettings();
  // Используем настройку часового пояса вместо клиентского offset
  const timezoneOffsetHours = settings.timezoneOffset;
  const timezoneOffsetMinutes = timezoneOffsetHours * 60;
  
  // Применяем смещение часового пояса к времени
  const adjustedTs = ts + timezoneOffsetMinutes * 60 * 1000;
  const date = new Date(adjustedTs);
  
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  const sign = timezoneOffsetHours >= 0 ? '+' : '-';
  const offsetHours = Math.abs(timezoneOffsetHours);
  return `${hh}:${mm}:${ss} UTC${sign}${offsetHours}`;
}
