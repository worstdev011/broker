# Comfortrade — полный справочник проекта

Документ описывает текущее состояние монорепозитория: стек, структура, все публичные HTTP/WebSocket маршруты, фронтенд-страницы, доменные сущности, поведение терминала, уведомления, инструменты и выплаты, а также **что логично вынести в админку** (часть ещё не реализована).

---

## 1. Стек и назначение

| Слой | Технологии |
|------|------------|
| Frontend | Next.js (App Router), React, next-intl (локали), Tailwind, Zustand (в т.ч. тосты), Recharts и др. |
| Backend | Fastify, Prisma, PostgreSQL, Redis (опционально для очередей), Bull / Bull Board |
| Цены и график | Движок котировок (OTC-симуляция + real через XChange), WebSocket для стрима |
| Документация API | OpenAPI + Swagger UI на бэкенде |

Платформа бинарных опционов: демо/реальный счёт, открытие сделок CALL/PUT, кошелёк (заглушки/логика депозита-вывода), профиль, KYC через Sumsub.

---

## 2. Структура репозитория (важное)

```
comfortrade/
├── backend/          # API, Prisma, движок цен, WS, джобы
│   ├── prisma/       # schema.prisma, seed.ts
│   └── src/
├── frontend/         # Next.js, терминал, лендинг, профиль
│   ├── app/[locale]/ # все пользовательские страницы
│   ├── components/
│   ├── lib/          # api, hooks, instruments registry
│   └── messages/     # en.json, ru.json, ua.json
```

Прокси в dev/prod: `frontend/next.config.js` переписывает `/api/*` и `/uploads/*` на бэкенд (`API_BACKEND_URL` / `NEXT_PUBLIC_API_URL`, по умолчанию `http://localhost:3001`), чтобы cookies и same-origin работали с фронта на `:3000`.

---

## 3. Локализация

- **Локали:** `ru`, `en`, `ua` (см. `frontend/i18n/routing.ts`).
- **Префикс в URL:** всегда (`localePrefix: 'always'`), т.е. корень редиректит на `/{locale}/...`.
- **Переводы:** `frontend/messages/{ru,en,ua}.json`.
- **Бэкенд:** `FRONTEND_DEFAULT_LOCALE` в env (согласование редиректов OAuth и т.п.).

---

## 4. Страницы фронтенда (Next.js)

Базовый шаблон пути: `/{locale}/...`.

| Путь | Назначение |
|------|------------|
| `/{locale}` | Главная (лендинг) |
| `/{locale}/login` | Вход |
| `/{locale}/register` | Регистрация |
| `/{locale}/terminal` | Торговый терминал (реальный счёт по умолчанию в логике страницы) |
| `/{locale}/terminal/demo` | Тот же терминал, режим демо по умолчанию |
| `/{locale}/profile` | Профиль; вкладки через query `?tab=...` |
| `/{locale}/wallet` | Кошелёк (отдельная страница) |
| `/{locale}/trade` | Редирект на `/profile?tab=trade` |
| `/{locale}/education` | Обучение |
| `/{locale}/about` | О проекте |
| `/{locale}/reviews` | Отзывы |
| `/{locale}/assets` | Активы |
| `/{locale}/start` | Старт / онбординг |
| `/{locale}/chart-test` | Изолированная страница теста графика и WebSocket |
| `/{locale}/policy/privacy` | Политика конфиденциальности |
| `/{locale}/policy/terms` | Условия |
| `/{locale}/policy/aml-kyc` | AML/KYC |
| `/{locale}/policy/risks` | Риски |

### Профиль — вкладки (`?tab=`)

| `tab` | Компонент / смысл |
|-------|-------------------|
| `profile` (по умолчанию) | Личные данные, аватар |
| `wallet` | `WalletTab` — баланс, операции |
| `trade` | `TradeProfileTab` — статистика/история сделок в контексте профиля |
| `support` | `SupportTab` |
| Отдельные секции на странице | Без смены `tab`: верификация (KYC), безопасность (2FA, пароль, сессии) — см. `profile/page.tsx` |

---

## 5. Backend: HTTP API (REST)

Префикс `/api` (кроме `/health`). Для мутаций с браузера нужен **CSRF** (заголовок `csrf-token`), кроме явно исключённых путей в `backend/src/app.ts`.

### 5.1 Система и документация

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/health` | Нет | Агрегированный health: БД, WebSocket manager, price engines |
| GET | `/api/docs` | Нет | Swagger UI |
| GET | `/api/auth/csrf` | Нет | Выдача CSRF-токена (cookie + генерация) |

### 5.2 Auth

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/auth/google` | Старт OAuth Google |
| GET | `/api/auth/google/callback` | Callback Google |
| POST | `/api/auth/register` | Регистрация (rate limit) |
| POST | `/api/auth/login` | Логин (rate limit); может вернуть шаг 2FA |
| POST | `/api/auth/2fa` | Подтверждение входа по 2FA (rate limit) |
| POST | `/api/auth/logout` | Выход (CSRF в skip paths) |
| GET | `/api/auth/me` | Текущий пользователь по сессии |

Сессии: httpOnly cookie; см. `CookieAuthAdapter`, `AuthService`.

### 5.3 Счета

| Метод | Путь | Auth |
|-------|------|------|
| GET | `/api/accounts` | Да |
| POST | `/api/accounts/create` | Да (`type`: `demo` \| `real`) |
| POST | `/api/accounts/switch` | Да (`accountId`) |
| POST | `/api/accounts/demo/reset` | Да |
| GET | `/api/account/snapshot` | Да |

### 5.4 Сделки

| Метод | Путь | Auth | Примечание |
|-------|------|------|------------|
| POST | `/api/trades/open` | Да | `accountId`, `direction`, `amount`, `expirationSeconds`, `instrument` |
| GET | `/api/trades` | Да | Query: `limit`, `offset`, `status` (`open` \| `closed`) |
| GET | `/api/trades/statistics` | Да | |
| GET | `/api/trades/balance-history` | Да | `startDate`, `endDate` |
| GET | `/api/trades/analytics` | Да | `startDate`, `endDate` |

### 5.5 Терминал и котировки (HTTP fallback к WS)

| Метод | Путь | Auth |
|-------|------|------|
| GET | `/api/terminal/snapshot` | Да | Query: `instrument` |
| GET | `/api/quotes/candles` | Да | Query: `instrument`, `timeframe`, `to`, `limit` |

### 5.6 Line chart (отдельный контур)

| Метод | Путь | Auth |
|-------|------|------|
| GET | `/api/line/snapshot` | Да | Query: `symbol` |
| GET | `/api/line/history` | Да | Query: `symbol`, `to`, `limit` |

### 5.7 Пользователь

| Метод | Путь | Auth |
|-------|------|------|
| GET | `/api/user/profile` | Да |
| PATCH | `/api/user/profile` | Да |
| POST | `/api/user/avatar` | Да | multipart |
| DELETE | `/api/user/avatar` | Да |
| DELETE | `/api/user/profile` | Да | удаление аккаунта (с подтверждением в теле) |
| POST | `/api/user/change-password` | Да |
| GET | `/api/user/sessions` | Да |
| DELETE | `/api/user/sessions/:sessionId` | Да |
| DELETE | `/api/user/sessions/others` | Да |
| POST | `/api/user/2fa/enable` | Да |
| POST | `/api/user/2fa/verify` | Да |
| POST | `/api/user/2fa/disable` | Да |

Статика аватаров: `/uploads/...` на бэкенде (на фронте проксируется rewrite’ом).

### 5.8 Кошелёк

| Метод | Путь | Auth |
|-------|------|------|
| POST | `/api/wallet/deposit` | Да |
| POST | `/api/wallet/withdraw` | Да | опционально `twoFactorCode` |
| GET | `/api/wallet/balance` | Да |
| GET | `/api/wallet/transactions` | Да |

### 5.9 Инструменты (пары) и доходность

| Метод | Путь | Auth | Роль |
|-------|------|------|------|
| GET | `/api/instruments` | Нет | Список инструментов с `payoutPercent` из БД (слияние с конфигом `INSTRUMENTS`) |
| PATCH | `/api/instruments/:id/payout` | Да | **Только админ** (`requireAdmin` + `ADMIN_EMAILS`) — тело `{ payoutPercent }`, диапазон **60–90** |

Источник истины по составу пар и движку цен: `backend/src/config/instruments.ts`. Строки в БД создаются/обновляются сидом и upsert’ом при смене payout.

**Важно для админки:** в Prisma у `Instrument` есть поле `isActive`, но текущий `PrismaInstrumentRepository.findAll` **не фильтрует** по нему и всегда отдаёт полный список из конфига. Отключение пары «сервером для клиентов» как фича — **ещё предстоит довести** (см. раздел 10).

### 5.10 KYC (Sumsub)

| Метод | Путь | CSRF / примечание |
|-------|------|-------------------|
| POST | `/api/kyc/init` | Обычная защита CSRF; тело `{ userId }` |
| POST | `/api/kyc/webhook` | CSRF **отключён**; сырой body для HMAC |

Детали интеграции: файл `KYC_AND_SUMSUB.md` в корне.

### 5.11 Очереди (Bull Board)

| Путь | Условие |
|------|---------|
| `/api/queues` | Регистрируется при наличии Redis и созданных очередей (`backend/src/jobs/board.ts`) |

Имена очередей (константы): `trade-closing`, `email`, `reports`, `cleanup` — фактическое создание зависит от `REDIS_URL` и bootstrap’а.

---

## 6. WebSocket

| Путь | Auth |
|------|------|
| `ws://.../ws` или `wss://.../ws` | Да, через cookie-сессию (см. `authenticateWebSocket`) |

**Клиент (localhost):** при фронте на `localhost:3000` URL строится на `http://localhost:3001` (см. `frontend/lib/hooks/useWebSocket.ts`). В проде — origin текущего сайта (нужен корректный TLS и тот же хост или явная настройка).

**Сообщения клиента → сервер (пример):**

- `{ type: 'ping' }` → ответ `server:time`
- `{ type: 'subscribe', instrument, timeframe? }` → `subscribed`, затем `chart:init`
- `{ type: 'unsubscribe', instrument }` / `{ type: 'unsubscribe_all' }`

**События сервера (неполный перечень типов, см. код):** `ws:ready`, `chart:init`, `price:update`, `candle:update`, `candle:close`, `candle:snapshot`, `trade:open`, `trade:close`, `trade:countdown`, `account.snapshot`, `error`, и др.

Лимиты: счётчик сообщений на окно (см. `WS_RATE_LIMIT_*` в `backend/src/config/constants.js`).

---

## 7. Модель данных (Prisma — кратко)

- **User** — email, пароль (nullable для Google), `googleId`, профиль, 2FA, KYC поля, связи.
- **Session** — токены, `userAgent`, `ipAddress`.
- **Account** — `demo` \| `real`, баланс, валюта, `isActive` (выбранный счёт).
- **Trade** — направление, инструмент, суммы, цены, статус (`OPEN`, `WIN`, `LOSS`, `TIE`), сроки.
- **Candle**, **PricePoint** — история для графиков.
- **Transaction** — депозиты, выводы, результат сделки, бонусы; статусы и способы оплаты (enum).
- **Instrument** — id, имя, base/quote, `isActive`, `payoutPercent`.

---

## 8. Инструменты (валютные пары): конфиг и типы

Файл `backend/src/config/instruments.ts`:

- **OTC** — синтетический движок (`source: 'otc'`, параметры `volatility`, `tickInterval`, коридор цены).
- **REAL** — внешний провайдер `xchange` (`source: 'real'`, символы Forex).

Список дублируется для UI в `frontend/lib/instruments.ts` (лейблы и `digits`). Дефолтный инструмент: `EURUSD_OTC`.

**Сид:** `backend/prisma/seed.ts` — upsert всех инструментов из `INSTRUMENTS`, выставляет `isActive: true`, payout на create детерминированно 60–90%; при update **не перетирает** payout.

---

## 9. Терминал (функциональность UI)

Страница: `frontend/app/[locale]/terminal/page.tsx` (+ `demo` вариант).

**Торговля:** выбор инструмента (`InstrumentMenu`), таймфрейма (`TimeframeMenu`), типа графика (свечи / линия), суммы и времени экспирации, открытие CALL/PUT, интеграция с `api` и WebSocket.

**График:** `ChartContainer`, индикаторы (`IndicatorMenu`, реестр индикаторов), рисование (`DrawingMenu`), оверлеи, режимы свечей, кроссхейр, line/candle refs.

**Данные:** `useTerminalSnapshot`, загрузка `/api/instruments` для **доходности (payout %)** по выбранной паре.

**Рынок:** для real-инструментов учитывается расписание (выходные и т.д.) — `getMarketStatus`, подсказки альтернатив в `chart:init`.

**Лейаут:** сохранение в `localStorage` (`terminalLayout`).

**Звук, полноэкранный режим, онбординг:** `OnboardingTour`, настройки графика (`ChartSettingsModal`), калькулятор суммы, модалка времени экспирации.

**История сделок:** `TradesHistoryModal`.

**Новости:** кнопка с иконкой газеты → панель `NewsModal`. Сейчас контент **захардкожен** в `frontend/app/[locale]/terminal/components/NewsModal.tsx` (массив `NEWS_ITEMS`, категории, сентимент для отображения). **Отдельного API новостей нет.**

**Колокольчик уведомлений в шапке:** компонент `NotificationsBell` — **моковые** записи в коде, без бэкенда.

**Тосты:** глобальные уведомления (`ToastProvider`, `stores/toast.store.ts`, `components/ui/Toast.tsx`) — успех/ошибка/инфо и спец-тип «сделка открыта»; вызываются из действий терминала и др.

**Верификация:** хук `useVerificationStatus` влияет на доступность операций (см. логику на странице).

---

## 10. Админка: что уже есть и что продумать

### 10.1 Уже реализовано (минимум)

- **Роль админа:** список email в `ADMIN_EMAILS` (env), проверка в `requireAdmin` после `requireAuth`.
- **API:** только `PATCH /api/instruments/:id/payout` для смены **процента выплаты** (60–90) по существующему id из конфига.

- **Операционка очередей:** при Redis — Bull Board на `/api/queues` (ретраи, failed jobs).

### 10.2 Рекомендуемые направления админ-панели (продукт + риск)

Ниже — логичные модули; часть опирается на поля схемы, которые **ещё не проброшены** в публичный API или UI.

| Модуль | Зачем | Заметки по текущему коду |
|--------|--------|---------------------------|
| **Инструменты** | Вкл/выкл пары, группировка OTC/REAL, сортировка в терминале, минимальный стейк | `Instrument.isActive` в БД есть, но API отдаёт все из конфига — нужен фильтр и PATCH админа |
| **Доходность** | Уже есть PATCH payout; в UI админки — таблица, история изменений, кто менял | Добавить audit log |
| **Параметры OTC-движка** | Волатильность, интервал тика, коридор цен | Сейчас только в `instruments.ts` — для продакшена либо env, либо БД + hot reload |
| **Расписание рынка** | Праздники, техработы, кастомные окна | `MarketStatus` частично зашито — вынос в конфиг/БД |
| **Пользователи** | Поиск, блокировка, сброс 2FA, просмотр сессий, принудительный logout | Часть user API есть; нет явного «ban» в схеме |
| **KYC** | Статус вручную, повторная верификация, просмотр webhook-логов | Sumsub webhook уже есть |
| **Финансы** | Подтверждение выводов, лимиты, антифрод флаги | Транзакции в БД; бизнес-процессы — на усмотрение |
| **Сделки** | Просмотр, спорные исходы, корректировки (осторожно с комплаенсом) | Торги в Prisma |
| **Новости** | Редактор, расписание публикаций, привязка к инструментам/сентименту | Сейчас только статический фронт |
| **Центр уведомлений** | Пуш в колокольчик / email / WS | Сейчас моки + тосты только на клиенте |
| **Промо и бонусы** | Кампании, процент на депозит | Enum `BONUS` в транзакциях задел |
| **Контент и политики** | Редактируемые тексты политик без деплоя | Сейчас статические страницы |
| **Система** | Версия, feature flags, maintenance mode | Нет в репо — типичный gap |
| **Аналитика** | Воронка, retention, GGR по инструментам | Можно строить на существующих trade/wallet эндпоинтах + BI |

### 10.3 Безопасность админки

- Отдельный роут (например `/admin` на фронте) + повторная проверка роли на **каждый** API.
- Желательно: отдельная сессия или SSO, IP allowlist, 2FA обязательна для админов.
- Audit log для финансовых и KYC действий.

---

## 11. Переменные окружения (ориентир)

См. `backend/.env.example` и `backend/src/config/env.ts`. Ключевые группы:

- Сервер: `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`
- Безопасность: `COOKIE_SECRET`, `FRONTEND_URL`, `FRONTEND_DEFAULT_LOCALE`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Котировки: `XCHANGE_API_KEY`
- Админы: `ADMIN_EMAILS` (список через запятую)
- Sumsub / webhook: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `WEBHOOK_SECRET_KEY`
- Загрузки: `MAX_UPLOAD_SIZE`

Фронт: `NEXT_PUBLIC_API_URL`, `API_BACKEND_URL` (rewrite), при необходимости отдельный WS origin (сейчас логика завязана на localhost vs `window.location.origin`).

---

## 12. Связанные документы в репозитории

- `KYC_AND_SUMSUB.md` — верификация
- `AUTH_ARCHITECTURE_AND_GOOGLE_RU.md`, `SECURITY_AND_ARCHITECTURE_RU.md` — если актуальны в вашей ветке
- `frontend/I18N_INSTRUCTIONS.md` — интернационализация

---

## 13. Версионирование документа

Документ снимок состояния кода репозитория **Comfortrade** на момент составления. При добавлении роутов или админки имеет смысл обновлять таблицы в §5–§6 и §10.
