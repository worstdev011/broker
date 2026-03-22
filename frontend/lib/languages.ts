/**
 * Список языков интерфейса (СНГ + основные мировые)
 * flag: локальный путь или код страны для flagcdn
 */
export const LANGUAGES = [
  { code: 'UA', label: 'Українська', flag: '/images/flags/ua.svg', flagCode: 'ua' },
  { code: 'EN', label: 'English', flag: '/images/flags/en.svg', flagCode: 'gb' },
  { code: 'DE', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png', flagCode: 'de' },
  { code: 'FR', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png', flagCode: 'fr' },
  { code: 'ES', label: 'Español', flag: 'https://flagcdn.com/w40/es.png', flagCode: 'es' },
  { code: 'RU', label: 'Русский', flag: '/images/flags/ru.svg', flagCode: 'ru' },
] as const;

export const LANG_STORAGE_KEY = 'profile-lang';
