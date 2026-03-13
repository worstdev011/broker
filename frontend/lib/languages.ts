/**
 * Список языков интерфейса (СНГ + основные мировые)
 * flag: локальный путь или код страны для flagcdn
 */
export const LANGUAGES = [
  { code: 'UA', label: 'Українська', flag: '/images/flags/ua.svg', flagCode: 'ua' },
  { code: 'EN', label: 'English', flag: '/images/flags/en.svg', flagCode: 'gb' },
  { code: 'DE', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png', flagCode: 'de' },
  { code: 'KZ', label: 'Қазақша', flag: 'https://flagcdn.com/w40/kz.png', flagCode: 'kz' },
  { code: 'BY', label: 'Беларуская', flag: 'https://flagcdn.com/w40/by.png', flagCode: 'by' },
  { code: 'UZ', label: "O'zbekcha", flag: 'https://flagcdn.com/w40/uz.png', flagCode: 'uz' },
  { code: 'KG', label: 'Кыргызча', flag: 'https://flagcdn.com/w40/kg.png', flagCode: 'kg' },
  { code: 'TJ', label: 'Тоҷикӣ', flag: 'https://flagcdn.com/w40/tj.png', flagCode: 'tj' },
  { code: 'AM', label: 'Հայերեն', flag: 'https://flagcdn.com/w40/am.png', flagCode: 'am' },
  { code: 'AZ', label: 'Azərbaycan', flag: 'https://flagcdn.com/w40/az.png', flagCode: 'az' },
  { code: 'KA', label: 'ქართული', flag: 'https://flagcdn.com/w40/ge.png', flagCode: 'ge' },
  { code: 'FR', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png', flagCode: 'fr' },
  { code: 'ES', label: 'Español', flag: 'https://flagcdn.com/w40/es.png', flagCode: 'es' },
  { code: 'ZH', label: '中文', flag: 'https://flagcdn.com/w40/cn.png', flagCode: 'cn' },
  { code: 'TM', label: 'Türkmençe', flag: 'https://flagcdn.com/w40/tm.png', flagCode: 'tm' },
  { code: 'MD', label: 'Română', flag: 'https://flagcdn.com/w40/md.png', flagCode: 'md' },
  { code: 'RU', label: 'Русский', flag: '/images/flags/ru.svg', flagCode: 'ru' },
] as const;

export const LANG_STORAGE_KEY = 'profile-lang';
