# Comfortrade: безопасность, авторизация, API и платформа

Документ описывает текущую реализацию в репозитории **на момент генерации**. Его можно передать другому ассистенту (например, Claude Code) как контекст по архитектуре.

---

## 1. Стек и границы системы

- **Backend:** Fastify (Node.js), Prisma + PostgreSQL, Redis (подключение в bootstrap), Bull/Bull Board для очередей.
- **Frontend:** Next.js (App Router), `next-intl` для локалей (`[locale]`), проксирование API через `rewrites` в `next.config.js`.
- **Реальное время:** WebSocket на бэкенде (`/ws`), отдельное подключение с фронта (не через Next rewrite для WS).

---

## 2. Безопасность (backend)

### 2.1. CORS

- Пакет `@fastify/cors`.
- **Production:** `origin` = `FRONTEND_URL` из env (строго один доверенный фронт).
- **Development:** `origin: true` (разрешены запросы с любых origin — удобство локальной разработки).
- **`credentials: true`** — браузер может отправлять cookies на кросс-доменные запросы только если origin разрешён (в prod это по сути same policy с фронтом).

### 2.2. Cookies и подпись

- Пакет `@fastify/cookie` с **`secret: COOKIE_SECRET`** — используется для **подписанных** cookies.
- Сессия хранится в cookie с именем **`session`**: `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `signed: true`, `secure` в production.
- TTL cookie по `maxAge` совпадает с константой **`SESSION_TTL_DAYS` (30 дней)**.

### 2.3. CSRF

- Пакет `@fastify/csrf-protection`: отдельная CSRF-cookie + проверка токена из заголовка **`csrf-token`**.
- Глобальный хук `onRequest`: для всех методов **кроме** `GET`, `HEAD`, `OPTIONS` выполняется CSRF-проверка, **кроме**:
  - `/health`
  - путей из **`CSRF_SKIP_PATHS`** в `app.ts`:
    - `/api/auth/register`
    - `/api/auth/login`
    - `/api/auth/2fa`
    - `/api/auth/logout`
    - `/api/kyc/webhook`
- Эндпоинт **`GET /api/auth/csrf`** выдаёт `{ csrfToken }` через `reply.generateCsrf()` (GET не проходит через обязательную CSRF-проверку тела запроса).

**Зачем skip для auth:** до логина у клиента нет сессии/стабильного контекста для классического double-submit CSRF в том же виде; после успешного `register`/`login`/`2fa` сервер отдаёт **`csrfToken` в JSON** — фронт кэширует его и шлёт в заголовке на мутации.

### 2.4. Helmet и CSP

- `@fastify/helmet` с **Content-Security-Policy**, учтены директивы для **Swagger UI** (`instance.swaggerCSP`).

### 2.5. Rate limiting

- Глобально: `@fastify/rate-limit` — **100 запросов / 1 минута** на IP (кэш `RATE_LIMIT_CACHE`), заголовки `x-ratelimit-*`, `retry-after`.
- Исключения глобального лимита: `/health`; в **не-production** локальные подсети (`127.0.0.1`, `::1`, `192.168.*`, `10.*` и IPv4-mapped варианты) в `allowList`.
- Точечные лимиты на маршрутах (через `config.rateLimit`):
  - регистрация: **3 / час**
  - логин: **5 / 15 минут**
  - логин 2FA (`/api/auth/2fa`): **5 / 5 минут**
  - загрузка аватара: **10 / час**

### 2.6. Пароли и сессии в БД

- Пароли: **bcrypt**, **10 раундов** (`utils/crypto.ts`).
- Сессия: случайный токен **64 hex-символа** (`randomBytes(32)`), в БД хранится только **SHA-256 хэш** токена (`hashToken`), не сам токен.
- В таблице `sessions` также пишутся **`userAgent`**, **`ipAddress`**, **`expiresAt`**.

### 2.7. Прочее

- **`X-Request-ID`:** на ответах; входящий `x-request-id` или новый UUID.
- **Ошибки:** централизованный `errorHandler` (в т.ч. форматирование Zod `VALIDATION_ERROR`).
- **Статика загрузок:** `@fastify/static` с префиксом `/uploads/` от папки `uploads` на диске.

---

## 3. Авторизация и аутентификация

### 3.1. Модель: cookie-сессии, не JWT в заголовке

- Клиент после логина/регистрации держит **подписанный httpOnly cookie `session`** с сырым session token.
- Защищённые HTTP-маршруты используют preHandler **`requireAuth`** (`auth.middleware.ts`):
  1. Читает токен из cookie (`CookieAuthAdapter.getSessionToken` + `unsignCookie`).
  2. Вызывает **`AuthService.getMe(token)`** — поиск сессии по хэшу, проверка срока, загрузка пользователя.
  3. Проставляет **`request.userId`**.

### 3.2. Роли и админ

- Отдельной RBAC-таблицы нет.
- **`requireAdmin`** после `requireAuth`: email пользователя (из БД по `userId`) должен входить в список **`ADMIN_EMAILS`** из env (строка через запятую, сравнение в lower case).
- Если `ADMIN_EMAILS` пуст — любой вызов `requireAdmin` → **403**.
- Админский маршрут в коде: **`PATCH /api/instruments/:id/payout`** (смена процента выплаты инструмента).

### 3.3. Потоки auth API

| Действие | Поведение |
|----------|-----------|
| **POST /api/auth/register** | Создание пользователя (уникальный 8-значный `id`), bcrypt пароль, опционально создание demo+real счетов, создание сессии, **Set-Cookie session**, в теле **user** + **csrfToken**. |
| **POST /api/auth/login** | Проверка email/пароля. Если включена 2FA — **без cookie**: `{ requires2FA: true, tempToken }`. Иначе — сессия + cookie + **csrfToken**. |
| **POST /api/auth/2fa** | Тело: `tempToken`, `code`. Проверка 2FA → сессия + cookie + **csrfToken**. |
| **POST /api/auth/logout** | Удаление сесси по токену из cookie, очистка cookie. |
| **GET /api/auth/me** | Текущий пользователь по session cookie; при битой сессии cookie может быть очищена. |

### 3.4. Временный токен при логине с 2FA

- Файл **`utils/tempTokens.ts`**: токен = **32 байта hex**, хранится в **in-memory `Map`** на процессе Node.
- TTL **5 минут**, периодическая очистка по таймеру, лимит размера карты **10 000** (при переполнении удаляется «старый» ключ).
- **`verifyTempToken` одноразовый:** после успешной проверки запись из Map **удаляется**.
- **Важно для продакшена:** при нескольких инстансах бэкенда без sticky sessions второй шаг 2FA может попасть на другой процесс — временный токен там не найдётся. Для горизонтального масштаба нужен общий store (Redis) или другой подход.

### 3.5. Фронтенд и cookies

- `next.config.js` проксирует **`/api/*`** и **`/uploads/*`** на `API_BACKEND_URL` / `NEXT_PUBLIC_API_URL` / `http://localhost:3001`.
- Браузер обращается к **тому же origin**, что и Next → cookie сессии считаются same-site для REST.
- **`lib/api/client.ts`:** все `fetch` только на **клиенте** (`window`), **`credentials: 'include'`**, для мутаций подставляется **`csrf-token`** (кроме явного исключения для logout). CSRF кэшируется в памяти страницы (`lib/api/csrf.ts`).

### 3.6. WebSocket и сессия

- Подключение к **`ws://…/ws`** (в dev часто прямой порт бэкенда `3001`).
- Аутентификация: **`WsAuthAdapter.authenticateWebSocket`** — снова **cookie session** на upgrade-запросе, затем `AuthService.getMe`. Без валидной сессии соединение закрывается.

---

## 4. Двухфакторная аутентификация (2FA)

### 4.1. Технология

- Сервис **`TwoFactorService`** (`domain/user/TwoFactorService.ts`):
  - Секрет TOTP: **`otplib`** (`generateSecret`).
  - QR: **`qrcode`** (data URL PNG), otpauth URI с issuer по умолчанию **`Comfortrade`**.
  - Проверка кода: **`otplib` verify**.
  - Резервные коды: **8 штук**, каждый **8 символов hex в верхнем регистре** (`randomBytes(4).toString('hex').toUpperCase()`), в БД хранятся **SHA-256** от каждого кода.

### 4.2. Включение 2FA (уже залогиненный пользователь)

1. **POST /api/user/2fa/enable** (только **`requireAuth`**, без отдельного Zod в роуте):  
   - Генерируется секрет, QR, backup codes.  
   - В БД сохраняются **`twoFactorSecret`** и **хэшированные** backup codes.  
   - Флаг **`twoFactorEnabled` в этот момент ещё не true** — финализация на шаге 2.

2. **POST /api/user/2fa/verify** (тело: **`code`** — Zod: **ровно 6 цифр**):  
   - Проверка TOTP по секрету.  
   - Вызов **`enableTwoFactor`** в репозитории — выставляет **`twoFactorEnabled: true`**, backup codes остаются как были (уже хэши).

### 4.3. Вход с 2FA

- После успешного пароля **`login`** возвращает **`tempToken`**, без сессии.
- Клиент вызывает **POST /api/auth/2fa** с **`tempToken`** и **`code`**.
- **`AuthService.verifyLogin2FA`:** проверяет temp token → пользователь с **`twoFactorEnabled` и секретом** → либо валидный **TOTP**, либо **резервный код** (сравнение по хэшу; при использовании backup код удаляется из массива в БД).
- После успеха создаётся обычная сессия и cookie.

### 4.4. Отключение 2FA

- **POST /api/user/2fa/disable** — тело: **`password`** + **`code`** (6 цифр по Zod): проверка пароля, проверка TOTP, затем **`disableTwoFactor`** (очистка секрета, флага, backup).

### 4.5. Замечание по резервным кодам на логине (важно для разработчиков)

- В **`auth.validation.ts`** для **`/api/auth/2fa`** поле **`code`** валидируется как **6 цифр**.
- Резервные коды — **8 hex-символов**. Из-за Zod они **не пройдут валидацию** на этом эндпоинте, хотя **`AuthService.verifyLogin2FA`** логически умеет backup codes. То есть **фактически на входе сейчас ожидается только TOTP**, если не менять схему валидации.

---

## 5. HTTP API: маршруты бэкенда

Префикс в приложении — как в таблице (часть идёт через Next rewrite как `/api/...`).

### 5.1. Auth

| Метод | Путь | Защита | Примечание |
|-------|------|--------|------------|
| GET | `/api/auth/csrf` | нет | Выдача CSRF токена |
| POST | `/api/auth/register` | нет + rate limit | CSRF skip |
| POST | `/api/auth/login` | нет + rate limit | CSRF skip |
| POST | `/api/auth/2fa` | нет + rate limit | CSRF skip |
| POST | `/api/auth/logout` | нет | CSRF skip; инвалидирует сессию если cookie есть |
| GET | `/api/auth/me` | cookie | |

### 5.2. Счета

| Метод | Путь | Защита |
|-------|------|--------|
| GET | `/api/accounts` | requireAuth |
| POST | `/api/accounts/create` | requireAuth |
| POST | `/api/accounts/switch` | requireAuth |
| POST | `/api/accounts/demo/reset` | requireAuth |
| GET | `/api/account/snapshot` | requireAuth |

### 5.3. Сделки

| Метод | Путь | Защита |
|-------|------|--------|
| POST | `/api/trades/open` | requireAuth |
| GET | `/api/trades` | requireAuth |
| GET | `/api/trades/statistics` | requireAuth |
| GET | `/api/trades/balance-history` | requireAuth |
| GET | `/api/trades/analytics` | requireAuth |

### 5.4. Терминал и котировки (HTTP)

| Метод | Путь | Защита |
|-------|------|--------|
| GET | `/api/terminal/snapshot` | requireAuth |
| GET | `/api/quotes/candles` | requireAuth |

### 5.5. Line chart (отдельный график)

| Метод | Путь | Защита |
|-------|------|--------|
| GET | `/api/line/snapshot` | requireAuth |
| GET | `/api/line/history` | requireAuth |

### 5.6. Пользователь и профиль

| Метод | Путь | Защита |
|-------|------|--------|
| GET | `/api/user/profile` | requireAuth |
| PATCH | `/api/user/profile` | requireAuth |
| POST | `/api/user/avatar` | requireAuth + лимит размера + rate limit |
| DELETE | `/api/user/avatar` | requireAuth |
| DELETE | `/api/user/profile` | requireAuth (пароль в теле) |
| POST | `/api/user/change-password` | requireAuth |
| GET | `/api/user/sessions` | requireAuth |
| DELETE | `/api/user/sessions/:sessionId` | requireAuth |
| DELETE | `/api/user/sessions/others` | requireAuth |
| POST | `/api/user/2fa/enable` | requireAuth |
| POST | `/api/user/2fa/verify` | requireAuth |
| POST | `/api/user/2fa/disable` | requireAuth |

### 5.7. Кошелёк

| Метод | Путь | Защита |
|-------|------|--------|
| POST | `/api/wallet/deposit` | requireAuth |
| POST | `/api/wallet/withdraw` | requireAuth |
| GET | `/api/wallet/balance` | requireAuth |
| GET | `/api/wallet/transactions` | requireAuth |

### 5.8. Инструменты (инструменты торговли)

| Метод | Путь | Защита |
|-------|------|--------|
| GET | `/api/instruments` | **публично** (без requireAuth) |
| PATCH | `/api/instruments/:id/payout` | requireAuth + **requireAdmin** |

### 5.9. KYC (Sumsub)

| Метод | Путь | Защита | Примечание |
|-------|------|--------|------------|
| POST | `/api/kyc/init` | **нет requireAuth в роуте** | Тело `{ userId }` — доверие к переданному id; CSRF **включён** (не в skip list). Создание applicant + access token. |
| POST | `/api/kyc/webhook` | HMAC подпись | CSRF **skip**; сырой body для проверки digest |

### 5.10. Системные

| Метод | Путь | Примечание |
|-------|------|------------|
| GET | `/health` | Без CSRF на мутациях не применимо; проверки БД, WS, price engines |
| GET | `/api/docs` | Swagger UI |
| — | `/api/queues` | Bull Board (если очереди инициализированы) |

---

## 6. WebSocket `/ws`

- Регистрация через `@fastify/websocket`, `maxPayload` 64 KiB.
- После подключения: сообщение **`ws:ready`** с `sessionId`, `serverTime`.
- Клиент может слать JSON:
  - **`ping`** → ответ **`server:time`**
  - **`subscribe`** / **`unsubscribe`** / **`unsubscribe_all`** по инструментам
- При subscribe сервер шлёт **`chart:init`** (свечи, активная свеча, цена, статус рынка и т.д.).
- **Rate limit на сообщения:** 100 сообщений / 1 с на соединение (сброс по скользящему окну).
- Доставка обновлений цен/свечей/сделок завязана на **`WebSocketManager`** и bootstrap событий (см. `websocket.bootstrap` и связанные модули).

---

## 7. Котировки, «брокер» и источники цен

В коде нет отдельного модуля с именем «брокер»; торговая логика опирается на **внутренние движки цен** и внешний провайдер для **real**-инструментов.

### 7.1. Конфиг инструментов

- Файл **`config/instruments.ts`**: у каждого инструмента есть **`source`**: **`otc`** (синтетический/внутренний движок) или **`real`** (внешний поток).
- Для **`real`** указан провайдер **`xchange`**: пара для подписки и символ.

### 7.2. XChange API (внешний поток real)

- **`PriceEngineManager`** при старте создаёт **`RealWebSocketHub`** если задан **`XCHANGE_API_KEY`**.
- Подключение к **`wss://api.xchangeapi.com/websocket/live`** с заголовком **`api-key`**.
- Без ключа в dev движок real-инструментов не поднимается (логируется ошибка).
- В **production** `XCHANGE_API_KEY` **обязателен** при валидации env.

### 7.3. OTC

- **`OtcPriceEngine`** использует параметры из конфига (asset, границы цены, волатильность и т.д. — см. `instruments.ts`).

### 7.4. База и история

- Таблицы **`candles`**, **`price_points`** в Prisma — хранение истории; line chart и снимки могут читать из БД и/или текущий **`PriceEngineManager`**.

### 7.5. Возможности «как у брокера» (функционал платформы)

- **Два типа счетов:** demo и real (уникальная пара `userId + type`), переключение активного счёта, сброс demo в рамках лимитов из констант.
- **Бинарные опционы по сути:** направление **CALL/PUT**, сумма, время экспирации (ограничения в `constants.ts`: min/max expiration, max amount и шаг).
- **Инструменты** из БД с **payout %** (дефолт 75, диапазон для админки 60–90).
- **Кошелёк:** депозит/вывод (суммы min/max в UAH по константам), история транзакций, типы из enum Prisma.
- **KYC:** Sumsub applicant + WebSDK token + webhook обновления статуса (`kycStatus`, `kycApplicantId` на User).
- **Профиль:** ФИО, ник, телефон, страна, дата рождения (18+), валюта один раз, аватар в файловое хранилище под `/uploads/`.

---

## 8. Фронтенд: маршруты страниц (App Router)

Локаль по умолчанию в сегменте **`[locale]`**. Основные страницы:

- `/[locale]` — главная  
- `/[locale]/login`, `/[locale]/register`  
- `/[locale]/terminal`, `/[locale]/terminal/demo`  
- `/[locale]/trade`  
- `/[locale]/profile`, `/[locale]/wallet`  
- `/[locale]/assets`, `/[locale]/about`, `/[locale]/education`, `/[locale]/reviews`, `/[locale]/start`  
- Политики: `/[locale]/policy/terms`, `privacy`, `aml-kyc`, `risks`  
- `/[locale]/chart-test` — тест графика  

Защита страниц на уровне UI: компоненты вроде **`AuthGuard`** и хук **`useAuth`** (проверка сессии через API).

**Файлы страниц и обвязка (по дереву `frontend/app/[locale]/`):**

| Путь | Назначение |
|------|------------|
| `page.tsx` | Лендинг / главная |
| `login/page.tsx` | Вход |
| `register/page.tsx` | Регистрация |
| `terminal/page.tsx` | Основной терминал |
| `terminal/demo/page.tsx` | Демо-терминал |
| `terminal/layout.tsx`, `loading.tsx`, `error.tsx` | Layout и состояния терминала |
| `terminal/components/*` | Модалки терминала (история сделок, время, сумма, новости, настройки графика, карточка сделки) |
| `trade/page.tsx` | Страница торговли (отдельный маршрут) |
| `profile/page.tsx` | Профиль пользователя |
| `wallet/page.tsx` | Кошелёк |
| `assets/page.tsx` | Активы |
| `about/page.tsx` | О проекте |
| `education/page.tsx` | Обучение |
| `reviews/page.tsx` | Отзывы |
| `start/page.tsx` | Старт / онбординг |
| `chart-test/page.tsx` | Тест line-chart |
| `policy/terms`, `privacy`, `aml-kyc`, `risks` | Юридические страницы |
| `not-found.tsx`, `error.tsx`, `global-error.tsx` | Ошибки Next |

Корневой `frontend/app/layout.tsx` — оболочка без локали; `frontend/app/[locale]/layout.tsx` — локаль + провайдеры.

---

## 9. Переменные окружения (без значений секретов)

**Backend (логика из `config/env.ts`):**

- Обязательные: **`PORT`**, **`DATABASE_URL`**
- Production дополнительно: **`COOKIE_SECRET`**, **`FRONTEND_URL`**, **`XCHANGE_API_KEY`**
- Опционально/с дефолтами: **`MAX_UPLOAD_SIZE`**, пулы Prisma, **`REDIS_URL`**
- Админы: **`ADMIN_EMAILS`** (через запятую)
- KYC: **`SUMSUB_APP_TOKEN`**, **`SUMSUB_SECRET_KEY`**, **`WEBHOOK_SECRET_KEY`** (без них — предупреждение при старте)

**Frontend:**

- **`API_BACKEND_URL`** / **`NEXT_PUBLIC_API_URL`** для rewrite и WS base (см. `next.config.js` и `useWebSocket`).

---

## 10. Полный справочник HTTP API (детализация)

Ниже — **все зарегистрированные маршруты**, тела/квери, ответы и побочные эффекты (события WS, cookie и т.д.).

### 10.1. Auth (`modules/auth`)

| Метод | Путь | Тело / query | Ответ (успех) | Побочные эффекты |
|-------|------|--------------|---------------|------------------|
| GET | `/api/auth/csrf` | — | `{ csrfToken }` | Генерация CSRF-cookie |
| POST | `/api/auth/register` | `{ email, password }` (Zod: email RFC-like, пароль **6–128** символов) | `201` `{ user, csrfToken }` | Cookie **`session`**, создание пользователя + сессии; при наличии `AccountService` в `AuthService` — **demo + real** счета |
| POST | `/api/auth/login` | `{ email, password }` | Либо `{ user, csrfToken }`, либо `{ requires2FA, tempToken }` | При обычном входе: cookie + CSRF в JSON |
| POST | `/api/auth/2fa` | `{ tempToken, code }` — **code строго 6 цифр** | `{ user, csrfToken }` | Cookie сессии |
| POST | `/api/auth/logout` | (схема logout, тело может быть пустым) | `{ message }` | Удаление сессии в БД, `clearCookie` |
| GET | `/api/auth/me` | — | `{ user }` или `401` | При невалидной сессии — очистка cookie |

**Контроллер `AuthController`:** `register`, `login`, `verifyLogin2FA`, `logout`, `me`.

### 10.2. Accounts (`modules/accounts`)

| Метод | Путь | Тело | Ответ | WS / прочее |
|-------|------|------|-------|-------------|
| GET | `/api/accounts` | — | `{ accounts }` — массив DTO: `id`, `type`, `balance` (string), `currency`, `isActive` | — |
| POST | `/api/accounts/create` | `{ type: 'demo' \| 'real' }` | `201` `{ account }` | Ошибка если счёт такого типа уже есть |
| POST | `/api/accounts/switch` | `{ accountId }` | `{ account }` | Асинхронно **`emitAccountSnapshot`** подписчикам пользователя |
| POST | `/api/accounts/demo/reset` | — | `{ account: { id, balance, currency, type } }` | Сброс только если баланс demo **ниже DEMO_RESET_LIMIT** (1000); иначе ошибка; затем **`emitAccountSnapshot`** |
| GET | `/api/account/snapshot` | — | `{ accountId, type: 'REAL'\|'DEMO', balance, currency, updatedAt }` или `404` | Активный счёт пользователя |

**`AccountService`:** `getAccounts`, `getActiveAccount`, `createAccount`, `setActiveAccount`, `adjustBalance`, `resetDemoAccount`, `getAccountSnapshot`, приватный `toDTO`.

### 10.3. Trades (`modules/trades`)

| Метод | Путь | Параметры | Ответ | Побочные эффекты |
|-------|------|------------|-------|------------------|
| POST | `/api/trades/open` | Body: `accountId`, `direction` CALL/PUT, `amount`, `expirationSeconds`, `instrument` | `201` `{ trade }` (DTO со строковыми decimal) | **`emitTradeOpen`**, **`registerTradeForCountdown`**, **`emitAccountSnapshot`** |
| GET | `/api/trades` | Query: `limit` (default 50, max 100), `offset`, `status` open\|closed (default open) | `{ trades, hasMore }` | — |
| GET | `/api/trades/statistics` | — | `{ statistics }` — метрики **только по real-счёту** | См. раздел 11 (TradeService) |
| GET | `/api/trades/balance-history` | `startDate`, `endDate` (опционально, иначе последние 30 дней) | `{ history: [{ date, balance }] }` или `400` | Расчёт по транзакциям + закрытым сделкам real-счёта |
| GET | `/api/trades/analytics` | те же даты | `{ analytics: { byInstrument, byDirection } }` | Закрытые сделки real за период |

**Правила открытия сделки (`TradeService.openTrade`):** сумма **(0, TRADE_MAX_AMOUNT]**, направление CALL/PUT, экспирация **5–300 с**, шаг **5 с**, счёт принадлежит пользователю, достаточный баланс, инструмент есть в БД, для суффикса **`_REAL`** — **не суббота/воскресенье UTC**, цена доступна от `PriceProvider`, payout из `InstrumentRepository` или дефолт 75%.

### 10.4. Terminal & quotes (`modules/terminal`)

| Метод | Путь | Query | Ответ |
|-------|------|-------|-------|
| GET | `/api/terminal/snapshot` | `instrument?` (default из `DEFAULT_INSTRUMENT_ID`) | **`TerminalSnapshot`**: `instrument`, `user {id,email}`, `accounts[]`, `activeAccount`, `openTrades[]` (с `secondsLeft`), `serverTime` |
| GET | `/api/quotes/candles` | `instrument?`, `timeframe?` (default `5s`), `to?` (ms), `limit?` (default 200) | `{ items: [{ open, high, low, close, startTime, endTime }] }` или `400` |

**Источник снимка:** `TerminalSnapshotAdapter` + `TimeService` для `secondsLeft`.

### 10.5. Line chart (`modules/linechart`)

| Метод | Путь | Query | Ответ |
|-------|------|-------|-------|
| GET | `/api/line/snapshot` | `symbol?` | `{ points: [{time, price}], currentPrice, serverTime }` — до **1500** точек из `price_points` если таблица есть |
| GET | `/api/line/history` | `symbol?`, `to?`, `limit?` (default 300) | `{ points }` — история **до** timestamp `to` |

### 10.6. User (`modules/user`)

| Метод | Путь | Тело / params | Ответ | Примечания |
|-------|------|---------------|-------|------------|
| GET | `/api/user/profile` | — | `{ user }` полный профиль без пароля | Синхронизация валюты активного счёта с `user.currency` при расхождении |
| PATCH | `/api/user/profile` | Поля профиля (Zod): имя/фамилия/ник/телефон E.164, страна (sanitize HTML), **currency** 3–10 символов upper, DOB `YYYY-MM-DD`, `avatarUrl` только локальный путь `/uploads/avatars/...` | `{ user }` | При смене `currency` — `updateCurrencyByUserId` для всех счетов пользователя |
| POST | `/api/user/avatar` | `multipart/file` | `{ avatarUrl }` | Расширения **jpg/jpeg/png/webp**, лимит `env.MAX_UPLOAD_SIZE`, дублируется проверка в `FileStorage` |
| DELETE | `/api/user/avatar` | — | `{ message }` | Удаление файла + `avatarUrl: null` |
| DELETE | `/api/user/profile` | `{ password }` | `{ message }` | Удаление всех сессий и пользователя; **clearSessionCookie** |
| POST | `/api/user/change-password` | `{ currentPassword, newPassword }` (новый пароль — strong schema) | `{ message }` | — |
| GET | `/api/user/sessions` | — | `{ sessions }` | Список сессий из БД |
| DELETE | `/api/user/sessions/:sessionId` | params | `{ message }` | Только своя сессия |
| DELETE | `/api/user/sessions/others` | — | `{ message }` | Удалить все кроме текущей (нужен cookie) |
| POST | `/api/user/2fa/enable` | — | `{ qrCode, backupCodes }` | Секрет + 8 backup, в БД хэши; **`twoFactorEnabled` ещё false** до verify |
| POST | `/api/user/2fa/verify` | `{ code }` 6 цифр | `{ success, message }` | Включает `twoFactorEnabled` |
| POST | `/api/user/2fa/disable` | `{ password, code }` | `{ success, message }` | TOTP + пароль |

**Статика:** `GET /uploads/*` отдаётся плагином static из `uploads/`.

### 10.7. Wallet (`modules/wallet`)

| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| POST | `/api/wallet/deposit` | `{ amount, paymentMethod }` (enum строка) | `{ transactionId, status, amount, currency }` |
| POST | `/api/wallet/withdraw` | то же | то же; `amount` в ответе положительный |
| GET | `/api/wallet/balance` | — | `{ currency, balance }` для **real** счёта (`getBalance` по транзакциям) |
| GET | `/api/wallet/transactions` | — | `{ transactions }` до **50** записей DEPOSIT/WITHDRAW, новые сверху |

**Логика:** `DepositService` / `WithdrawService` — суммы **200–1000** UAH (`DEPOSIT_*`, `WITHDRAW_*`), создаётся транзакция PENDING → **сразу confirm** + дельта баланса счёта (**TODO:** реальный платёжный провайдер).

### 10.8. Instruments (`modules/instruments`)

| Метод | Путь | Защита | Тело / ответ |
|-------|------|--------|--------------|
| GET | `/api/instruments` | Публично | Массив: `id`, `name`, `base`, `quote`, `digits`, `payoutPercent` |
| PATCH | `/api/instruments/:id/payout` | requireAuth + requireAdmin | `{ payoutPercent }` → `{ success: true }` | `id` должен существовать в **`INSTRUMENTS`** конфиге |

### 10.9. KYC (`modules/kyc`)

| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| POST | `/api/kyc/init` | `{ userId }` | `{ token, applicantId }` | Sumsub applicant (409 — уже есть) + access token; опционально запись `kycApplicantId`, `kycStatus: pending` |
| POST | `/api/kyc/webhook` | Raw JSON (HMAC) | `{ ok: true }` или 400/403 | События: `applicantReviewed` (GREEN→verified, RED→rejected), `applicantPending` / `applicantOnHold` → pending |

### 10.10. Система

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | JSON: общий статус + `database`, `websocket`, `priceEngines` |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/queues` | Bull Board (если очереди созданы) |

---

## 11. Доменные сервисы: полный перечень публичных методов

### 11.1. `AuthService` (`domain/auth/AuthService.ts`)

- `register` → пользователь, хэш пароля, сессия, опционально demo+real счета  
- `login` → сессия или `{ requires2FA, tempToken }`  
- `verifyLogin2FA` → сессия после TOTP/backup (см. ограничение Zod на backup)  
- `logout`  
- `getMe`  
- Приватно: `createSession`  

### 11.2. `UserService` (`domain/user/UserService.ts`)

- `getProfile`, `updateProfile`, `deleteProfile`, `changePassword`  
- `getUserSessions`, `revokeSession`, `revokeOtherSessions`  
- `enable2FA`, `verify2FA`, `disable2FA`  

### 11.3. `TwoFactorService` (`domain/user/TwoFactorService.ts`)

- `generateSecret`, `generateQRCode`, `verifyToken`, `generateBackupCodes`, `hashBackupCode`, `verifyBackupCode`, `removeBackupCode`  

### 11.4. `AccountService` — см. §10.2

### 11.5. `TradeService` (`domain/trades/TradeService.ts`)

- `openTrade`  
- `getTrades`, `getTradesPaginated`  
- `getTradeStatistics` — по **real** счёту: `totalTrades`, `winRate`, `totalVolume`, `netProfit`, `winCount`/`lossCount`/`tieCount`, `maxTrade`, `minTrade`, `bestProfit`  
- `getBalanceHistory` — помесячно/подневно агрегированная «ступенька» баланса  
- `getTradeAnalytics` — `byInstrument[]`, `byDirection.call/put`  

### 11.6. `TradeClosingService` (`domain/trades/TradeClosingService.ts`)

- `closeExpiredTrades` — для каждой OPEN с `expiresAt <= now`: взять цену; если цены нет дольше **60 с** после экспирации — закрыть как **TIE** с `exitPrice = entryPrice`; иначе пропуск; при успехе **`closeWithBalanceCredit`**, **`emitTradeClose`**, **`emitAccountSnapshot`**, **`unregisterTradeFromCountdown`**  
- Приватно: `closeTrade`  

### 11.7. `TradeEntity` (`domain/trades/TradeEntity.ts`)

- `determineResult` — WIN/LOSS/TIE по entry/exit и направлению  
- `calculatePayoutAmount` = `amount * payout`  
- `isExpired`, `isOpen`  

### 11.8. `DepositService` / `WithdrawService` — см. §10.7

### 11.9. `TerminalSnapshotService`

- `getSnapshot(userId, instrument)` — делегирует порт  

### 11.10. `TimeService` (`domain/time/TimeService.ts`)

- `now`, `secondsLeft`, `alignToCandleBoundary`  

### 11.11. `PriceServiceAdapter` (`infrastructure/pricing/PriceServiceAdapter.ts`)

- Реализует **`PriceProvider.getCurrentPrice`** через `PriceEngineManager`  

---

## 12. Порты репозиториев (контракты)

Интерфейсы в `backend/src/ports/repositories/*.ts` — реализация **Prisma*** в `infrastructure/prisma/`.

- **`UserRepository`:** findByEmail/Id, existsById, create, updateProfile, findByNickname/Phone, deleteById, updatePassword, 2FA: updateTwoFactorSecret, enableTwoFactor, disableTwoFactor, updateBackupCodes  
- **`SessionRepository`:** create, findByToken, deleteByToken, deleteAllByUserId, findAllByUserId, deleteById, findById, deleteAllExcept  
- **`AccountRepository`:** findByUserId, findActiveByUserId, findByUserIdAndType, findById, create, setActive, updateBalance, getRealAccount, findDemoByUserId, setBalance, updateCurrencyByUserId  
- **`TradeRepository`:** create, findOpenExpired, findById, findByUserId, findByUserIdPaginated, findByAccountId, findClosedByAccountIdBefore/InDateRange, updateResult, **createWithBalanceDeduction**, **closeWithBalanceCredit**  
- **`TransactionRepository`:** create, confirm, getBalance, findById, findByAccountId, findConfirmedByAccountIdBefore/InDateRange  
- **`InstrumentRepository`:** findAll, findById, updatePayout  
- **`TerminalSnapshotPort`:** `getSnapshot`  
- **`PriceProvider`:** `getCurrentPrice`  

**`FileStorage`:** `saveAvatar`, `deleteAvatar` (локальные файлы `uploads/avatars/{userId}-{random}.ext`).

### 12.1. Middleware и валидация запросов

- **`middleware/errorHandler.ts`** — `ZodError` → 400 + `details`; `AppError` → code/message; Fastify CSRF коды → 403 `CSRF_ERROR`; Fastify validation → 400; прочие 500: в **production** без `stack`, в dev со `stack`.  
- **`middleware/rateLimit.ts`** — глобальный `@fastify/rate-limit`.  
- **`middleware/uploadLimit.ts`** — preHandler для аватара: если есть `Content-Length` и он больше **`MAX_UPLOAD_SIZE + 1MB`** (overhead формы) → 413.  
- **`modules/auth/auth.middleware.ts`** — `requireAuth`, `requireAdmin`.  
- **`shared/validation/validateBody.ts`** — фабрика preHandler из Zod-схемы.  
- **`shared/validation/sanitize.ts`** — `sanitizeHtml` для страны в профиле.  
- **`shared/validation/schemas.ts`** — email, пароли, ник, имена, `avatarUrl` (только путь под `/uploads/avatars/...`).

---

## 13. WebSocket `/ws` — протокол и рассылки

### 13.1. Подключение

- Upgrade на `/ws`, аутентификация по **той же cookie `session`**, что и REST.  
- Первое сообщение от сервера: **`{ type: 'ws:ready', sessionId, serverTime }`**.  
- Heartbeat менеджера: `WS_HEARTBEAT_INTERVAL_MS` (30 с).

### 13.2. Сообщения от клиента (`WsClientMessage`)

- `{ type: 'ping' }` → `{ type: 'server:time', data: { timestamp } }`  
- `{ type: 'subscribe', instrument, timeframe? }` → подписка, ответ `subscribed`, затем **`chart:init`** с полным пакетом свечей/рынка  
- `{ type: 'unsubscribe', instrument }` → `unsubscribed`  
- `{ type: 'unsubscribe_all' }` → серия `unsubscribed`  
- Лимит: **100 сообщений / 1 с** на соединение → `{ type: 'error', message }`  

### 13.3. События от сервера (типы из `shared/websocket/WsEvents.ts`)

- **`price:update`**, **`candle:update`**, **`candle:close`**, **`candle:snapshot`**, **`chart:init`** — с полем `instrument` где применимо  
- **`trade:open`**, **`trade:close`** (DTO + `result`: WIN\|LOSS\|TIE)  
- **`trade:countdown`** — раз в секунду из `time.bootstrap` для сделок в кэше  
- **`account.snapshot`** — баланс активного счёта  
- **`server:time`** — каждую 1 с broadcast всем + ответ на ping  
- **`server:shutdown`** (тип в union; использование — по коду вызова)  
- **`error`**, **`subscribed`**, **`unsubscribed`**

### 13.4. Бинарные тики

В `websocket.bootstrap` на событие `price_tick` шлётся **binary buffer**:  
`[0x01][len:1][instrument ASCII][price: Float64 BE][timestamp: Float64 BE]`.  
Фронт в `useWebSocket` парсит `msgType === 0x01`.

### 13.5. `WebSocketManager`

- `register` / `unregister`, `broadcast`, `sendToUser`, `broadcastToInstrument`, `broadcastCandleToInstrument` (фильтр по `activeTimeframe`), `broadcastRawToInstrument`, `getClientCount`, heartbeat start/stop.

---

## 14. Фоновые задачи, очереди и bootstrap

### 14.1. Порядок старта (`bootstrap/index.ts`)

1. `connectDatabase`  
2. `connectRedis`  
3. `initWebSocket` — `@fastify/websocket`, регистрация `/ws`, heartbeat  
4. `bootstrapPrices` — `PriceEngineManager.start()`, **`bootstrapWebSocketEvents`** (подписка на price_tick / candle_closed по каждому инструменту)  
5. `bootstrapTrades` — `TradeClosingService` + если **`REDIS_URL`** — Bull queue **repeat** каждые **`TRADE_CLOSING_INTERVAL_MS` (1000 мс)**; иначе **setInterval** с тем же интервалом  
6. `bootstrapTimeUpdates` — секундный таймер countdown сделок  
7. `registerBullBoard` — `/api/queues`  

### 14.2. Очереди (`jobs/queues.ts`)

Имена: **`trade-closing`**, **`email`**, **`reports`**, **`cleanup`**.  
Фабрики `createTradeClosingQueue`, `createEmailQueue`, `createCleanupQueue` — только при **`REDIS_URL`**; в **`getQueues()`** попадают только реально созданные.  
**Обработчик** в коде подключён для **trade-closing** (`closeExpiredTrades`). Очереди email/reports/cleanup создаются, но **процессоры в показанном коде не регистрировались** (заготовка).

### 14.3. Закрытие сделок

- Интервал **`TRADE_CLOSING_INTERVAL_MS`**.  
- При отсутствии цены дольше **`TRADE_STALE_THRESHOLD_MS` (60 с)** — принудительный **TIE**.

---

## 15. Фронтенд: клиенты API, хуки, сторы, утилиты

### 15.1. HTTP

- **`lib/api/client.ts`** — `apiRequest`, `ApiError`, **`authApi`** (register, login, verify2FA, logout, me), **`kycApi.init`**. Мутации: CSRF (кроме logout), `credentials: 'include'`, таймаут **15 с**, только **`typeof window !== 'undefined'`**.  
- **`lib/api/api.ts`** — универсальная **`api()`** с CSRF на мутациях, таймаут, `AbortSignal` merge.  
- **`lib/api/csrf.ts`** — кэш токена, `get/set/clear`.  
- **`lib/api/validationError.ts`** — разбор ошибок валидации для UI.

### 15.2. Хуки (`lib/hooks/`)

- **`useAuth`** — state, `checkAuth` (mount), `login` (в т.ч. ветка 2FA + `tempToken`), `verify2FA`, `register`, `logout`  
- **`useWebSocket`** — подключение к `ws://host:port/ws`, ping, бинарные тики, подписки, обработка событий терминала  
- **`useTerminalSnapshot`** — HTTP снимок терминала  
- **`useAccountSwitch`**, **`useVerification`**, **`useDisplayName`**, **`useModalA11y`**, **`useClickOutside`**, **`useLocalStorageSet`**

### 15.3. Zustand

- **`stores/account.store.ts`** — `snapshot`, `setSnapshot`, `clear`  
- **`stores/toast.store.ts`** — уведомления  

### 15.4. Прочие `lib/`

- **`constants.ts`**, **`instruments.ts`**, **`formatCurrency.ts`**, **`currencyFlags.ts`**, **`languages.ts`**, **`utils.ts`**, **`logger.ts`**, **`chartSettings.ts`**, **`terminalLayout.ts`**, **`tradeClosePnl.ts`**

### 15.5. Компоненты (крупные зоны)

- **`components/auth/*`** — AuthGuard и формы  
- **`components/profile/*`** — вкладки профиля, **SecurityTab** (2FA UI вызывает `/api/user/2fa/*` через `api()`)  
- **`components/chart/*`** — в т.ч. **`LineChart.tsx`** (крупный модуль графика)

---

## 16. Константы бизнес-логики (`config/constants.ts`) — ключевые значения

| Константа | Значение / смысл |
|-----------|------------------|
| `DEFAULT_PAYOUT_PERCENT` | 75 |
| `PAYOUT_MIN` / `PAYOUT_MAX` | 60 / 90 (для админской смены) |
| `DEMO_INITIAL_BALANCE` | 10 000 |
| `DEMO_RESET_LIMIT` | 1 000 — ниже этого баланса разрешён reset demo |
| `DEMO_DEFAULT_CURRENCY` | USD |
| `REAL_DEFAULT_CURRENCY` | UAH |
| `DEPOSIT_MIN/MAX`, `WITHDRAW_MIN/MAX` | 200 / 1000 UAH |
| `SESSION_TTL_DAYS` | 30 |
| `TRADE_MIN/MAX_EXPIRATION_SECONDS` | 5 / 300, шаг 5 |
| `TRADE_MAX_AMOUNT` | 50 000 |
| `TRADE_CLOSING_INTERVAL_MS` | 1 000 |
| `TRADE_STALE_THRESHOLD_MS` | 60 000 |
| `LINE_CHART_SNAPSHOT_TAKE` / `HISTORY_LIMIT` | 600 / 300 |
| Rate limits | см. §2.5 исходного документа |

Таймфреймы свечей: **`TIMEFRAME_SECONDS`** — от `5s` до `1d` (см. файл).

---

## 17. Модели Prisma (кратко)

- **User** — профиль, 2FA поля, **kycStatus**, **kycApplicantId**  
- **Session** — tokenHash, expiresAt, userAgent, ipAddress  
- **Account** — type demo/real, balance, currency, isActive, unique (userId, type)  
- **Trade** — direction CALL/PUT, status OPEN/WIN/LOSS/TIE, суммы, цены, индексы по user/account/instrument/status  
- **Candle**, **PricePoint** — история  
- **Transaction** — типы DEPOSIT/WITHDRAW/TRADE_RESULT/BONUS, статусы, PaymentMethod enum  
- **Instrument** — id, name, base, quote, payoutPercent  

---

## 18. Краткий чеклист для аудита

- [ ] Секреты только в env, не в git.  
- [ ] Production: строгий CORS, `secure` cookies, сильный `COOKIE_SECRET`.  
- [ ] Понимание риска **`tempToken` в памяти** при нескольких инстансах.  
- [ ] **KYC init** не привязывает `userId` к сессии на уровне middleware — оценить, нужна ли проверка «только свой userId».  
- [ ] Резервные коды при логине vs Zod на **`/api/auth/2fa`**.  
- [ ] Депозит/вывод сейчас **мгновенно confirm** без внешнего провайдера.  
- [ ] Очереди **email/reports/cleanup** без процессоров — мёртвый код или планы.  

---

*Конец документа.*
