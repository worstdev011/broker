# Инструкция для AI: вынос текстов в систему переводов (i18n)

## Контекст

Проект COMFORTRADE (Next.js 14, App Router) переведён на архитектуру `next-intl`. 
Архитектура полностью настроена и работает. Осталась рутинная работа: **вынести захардкоженные русские тексты из компонентов/страниц в JSON-файлы переводов**.

## Что уже сделано (НЕ трогай)

- `i18n/routing.ts` — конфиг локалей
- `i18n/request.ts` — загрузка сообщений
- `middleware.ts` — определение локали
- `components/navigation.ts` — locale-aware Link/useRouter/usePathname
- `app/layout.tsx` — root layout
- `app/[locale]/layout.tsx` — locale layout с NextIntlClientProvider
- `messages/ru.json`, `messages/en.json`, `messages/ua.json` — файлы переводов (структура создана)
- `components/Footer.tsx` — ПОЛНОСТЬЮ переведён (образец)
- `components/SiteHeader.tsx` — ПОЛНОСТЬЮ переведён (образец)
- `components/AppHeader.tsx` — ПОЛНОСТЬЮ переведён (образец)

## Что нужно сделать

Для каждого файла из списка ниже:

1. Найти ВСЕ захардкоженные русские строки в JSX
2. Добавить соответствующие ключи в `messages/ru.json` (в правильный раздел)
3. Заменить строки на вызовы `t('key')` с `useTranslations`
4. Добавить те же ключи в `messages/en.json` (перевести на английский)
5. Добавить те же ключи в `messages/ua.json` (перевести на украинский)

## Паттерн замены (на примере готового Footer.tsx)

### БЫЛО:
```tsx
export default function Footer() {
  return (
    <footer>
      <h3>Быстрые ссылки</h3>
      <p>© 2024 Comfortrade. Все права защищены.</p>
    </footer>
  )
}
```

### СТАЛО:
```tsx
'use client'  // ОБЯЗАТЕЛЬНО для useTranslations в клиентских компонентах

import { useTranslations } from 'next-intl'

export default function Footer() {
  const t = useTranslations('footer')      // неймспейс = раздел в JSON
  const tc = useTranslations('common')     // можно несколько неймспейсов

  return (
    <footer>
      <h3>{t('quick_links')}</h3>
      <p>{tc('all_rights')}</p>
    </footer>
  )
}
```

### В messages/ru.json:
```json
{
  "footer": {
    "quick_links": "Быстрые ссылки"
  },
  "common": {
    "all_rights": "© 2024 Comfortrade. Все права защищены."
  }
}
```

## Правила

1. **`'use client'`** — ОБЯЗАТЕЛЕН в файлах, использующих `useTranslations`. Если его нет — добавь.
2. **Неймспейсы**: используй существующие разделы из `messages/ru.json`:
   - `common` — общие строки (кнопки, лейблы, переиспользуемые)
   - `nav` — навигация
   - `auth` — авторизация/регистрация
   - `home` — главная страница
   - `about` — страница "О компании"
   - `footer` — футер
   - `profile` — профиль
   - `terminal` — терминал
   - `trade` — торговля
   - `wallet` — кошелёк
   - `assets` — активы
   - `education` — обучение
   - `reviews` — отзывы
   - `start` — "Как начать"
   - `policy` — политики
   - `metadata` — SEO метаданные
3. **Ключи**: snake_case, описательные. Пример: `hero_title`, `feature1_desc`, `cta_button`
4. **НЕ трогай**: имена классов CSS, href-ы, Image src, alt для картинок (если это не текст для пользователя)
5. **Aria-label**: тоже переводи через `t()`
6. **Placeholder**: тоже переводи
7. **Строки ошибок** (alert, setError): переводи через `t()`
8. **Не ломай** JSX-выражения и интерполяцию — если текст содержит `{переменная}`, используй:
   ```tsx
   t('key', { variable: value })
   ```
   А в JSON: `"key": "Текст {variable} продолжение"`

## Файлы для обработки (в порядке приоритета)

### Страницы (app/[locale]/):
1. `app/[locale]/page.tsx` — главная (МНОГО текста, формы авторизации)
2. `app/[locale]/about/page.tsx` — о компании
3. `app/[locale]/start/page.tsx` — как начать
4. `app/[locale]/assets/page.tsx` — активы
5. `app/[locale]/education/page.tsx` — обучение
6. `app/[locale]/reviews/page.tsx` — отзывы
7. `app/[locale]/policy/terms/page.tsx` — условия
8. `app/[locale]/policy/privacy/page.tsx` — конфиденциальность
9. `app/[locale]/policy/risks/page.tsx` — риски
10. `app/[locale]/policy/aml-kyc/page.tsx` — AML/KYC
11. `app/[locale]/terminal/page.tsx` — терминал (ОГРОМНЫЙ файл, много UI текстов)
12. `app/[locale]/profile/page.tsx` — профиль
13. `app/[locale]/trade/page.tsx` — торговля
14. `app/[locale]/wallet/page.tsx` — кошелёк
15. `app/[locale]/not-found.tsx` — 404
16. `app/[locale]/error.tsx` — ошибки
17. `app/[locale]/trade/error.tsx`
18. `app/[locale]/profile/error.tsx`
19. `app/[locale]/terminal/error.tsx`

### Компоненты (components/):
20. `components/profile/SecurityTab.tsx`
21. `components/profile/TradeProfileTab.tsx`
22. `components/profile/VerificationTab.tsx`
23. `components/profile/WalletTab.tsx`
24. `components/profile/SupportTab.tsx`
25. `components/chart/ChartTypeMenu.tsx`
26. `components/chart/InstrumentMenu.tsx`
27. `components/chart/TimeframeMenu.tsx`
28. `components/chart/DrawingMenu.tsx`
29. `components/chart/IndicatorMenu.tsx`
30. `components/chart/OverlayPanel.tsx`
31. `components/chart/SentimentBar.tsx`
32. `components/CurrencyCountryModal.tsx`
33. `components/auth/AuthGuard.tsx`

### Вложенные layouts (SEO metadata):
34. Все `layout.tsx` внутри `app/[locale]/*/` — заменить статические `export const metadata` на `generateMetadata` с переводами (по образцу `app/[locale]/layout.tsx`)

## Проверка

После каждого файла запускай:
```bash
npx next build
```
Если билд проходит — файл обработан корректно.

## Как добавить новый язык потом

1. Создать `messages/de.json` (скопировать `ru.json`, перевести)
2. Добавить `'de'` в массив `locales` в `i18n/routing.ts`
3. Обновить matcher в `middleware.ts`: `'/(ru|en|ua|de)/:path*'`
4. Всё — маршруты `/de/*` появятся автоматически
