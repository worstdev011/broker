# PROJECT_SNAPSHOT.md

Снимок состояния репозитория `comfortrade` по фактам из исходного кода (без `node_modules`, без сгенерированного Prisma-клиента как «логики»).

---

## 1. BACKEND

**Стек:** Fastify (`backend/src/server.ts`, `backend/src/app.ts`), Prisma + PostgreSQL (`backend/prisma/schema.prisma`), Redis + BullMQ (`backend/src/jobs/trade-closing.worker.ts`, `backend/src/bootstrap/redis.ts`).

### 1.1 Модули (папки `backend/src/modules/*`)

| Модуль | Роут-префикс (регистрация в `createApp`) | Файл маршрутов |
|--------|------------------------------------------|----------------|
| health | `/api/health` | `backend/src/modules/health/health.routes.ts` |
| auth | `/api/auth` | `backend/src/modules/auth/auth.routes.ts` |
| accounts | `/api/accounts` | `backend/src/modules/accounts/accounts.routes.ts` |
| trades | `/api/trades` | `backend/src/modules/trades/trades.routes.ts` |
| terminal | `/api/terminal` | `backend/src/modules/terminal/terminal.routes.ts` |
| user (+ drawings, chart-settings) | `/api/user` | `backend/src/modules/user/user.routes.ts` |
| wallet | `/api/wallet` | `backend/src/modules/wallet/wallet.routes.ts` |
| instruments | `/api/instruments` | `backend/src/modules/instruments/instruments.routes.ts` |
| kyc | `/api/kyc` | `backend/src/modules/kyc/kyc.routes.ts` |
| admin | `/api/admin` | `backend/src/modules/admin/admin.routes.ts` |
| quotes | `/api/quotes` | `backend/src/modules/quotes/quotes.routes.ts` |
| line | `/api/line` | `backend/src/modules/line/line.routes.ts` |
| websocket | `/ws` | `backend/src/websocket/ws.routes.ts` |

**Доменная логика:** `backend/src/domain/*` — `auth.service.ts`, `user.service.ts`, `account.service.ts`, `terminal.service.ts`, `trade.service.ts`, `trade-closing.service.ts`, `trade.entity.ts`, `trade.constants.ts`, `deposit.service.ts`, `withdraw.service.ts`, `kyc.service.ts`, `instrument.service.ts`.

**Интеграции-сервисы:** `backend/src/services/BetaTransferService.ts`, `backend/src/services/SumsubService.ts`.

**Инфраструктура:** `backend/src/infrastructure/prisma/*` (репозитории, `client.ts`), `backend/src/infrastructure/storage/FileStorage.ts`.

### 1.2 API эндпоинты (метод, путь, обработчик, авторизация)

Префиксы совпадают с регистрацией в `backend/src/app.ts`.  
Cookie сессии: имя `session_token`, подписанный cookie (`auth.middleware.ts`, `auth.controller.ts`, `ws.auth.ts`).  
CSRF: глобально для `POST`/`PUT`/`PATCH`/`DELETE`, кроме путей из `CSRF_SKIP_PATHS` в `backend/src/app.ts`:  
`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/2fa`, `/api/wallet/webhook`, `/api/kyc/webhook`, `/api/kyc/init`.

| Метод | Путь | Обработчик | Авторизация |
|-------|------|------------|-------------|
| GET | `/api/health/` | анонимный handler | нет |
| GET | `/api/auth/csrf` | `authController.handleCsrf` | нет |
| POST | `/api/auth/register` | `authController.handleRegister` | нет (rate limit 5/h) |
| POST | `/api/auth/login` | `authController.handleLogin` | нет (rate limit 10/15m) |
| POST | `/api/auth/2fa` | `authController.handle2FA` | нет (rate limit 5/5m) |
| POST | `/api/auth/logout` | `authController.handleLogout` | нет (CSRF skipped) |
| GET | `/api/auth/me` | `authController.handleMe` | `requireAuth` |
| GET | `/api/accounts/` | `accountsController.handleList` | `requireAuth` (hook на весь роутер) |
| POST | `/api/accounts/switch` | `accountsController.handleSwitch` | `requireAuth` |
| POST | `/api/accounts/demo/reset` | `accountsController.handleDemoReset` | `requireAuth` |
| GET | `/api/accounts/snapshot` | `accountsController.handleSnapshot` | `requireAuth` |
| POST | `/api/trades/open` | `tradesController.handleOpen` | `requireAuth` (hook) + rate limit 1m по `userId` |
| GET | `/api/trades/` | `tradesController.handleList` | `requireAuth` |
| GET | `/api/trades/statistics` | `tradesController.handleStatistics` | `requireAuth` |
| GET | `/api/trades/balance-history` | `tradesController.handleBalanceHistory` | `requireAuth` |
| GET | `/api/trades/analytics` | `tradesController.handleAnalytics` | `requireAuth` |
| GET | `/api/terminal/snapshot` | `terminalController.snapshot` | `requireAuth` |
| GET | `/api/user/profile` | `userController.getProfile` | `requireAuth` |
| PATCH | `/api/user/profile` | `userController.updateProfile` | `requireAuth` |
| DELETE | `/api/user/profile` | `userController.deleteProfile` | `requireAuth` |
| POST | `/api/user/avatar` | `userController.uploadAvatar` | `requireAuth` |
| DELETE | `/api/user/avatar` | `userController.deleteAvatar` | `requireAuth` |
| POST | `/api/user/change-password` | `userController.changePassword` | `requireAuth` |
| POST | `/api/user/set-password` | `userController.setPassword` | `requireAuth` |
| GET | `/api/user/sessions` | `userController.getSessions` | `requireAuth` |
| DELETE | `/api/user/sessions/others` | `userController.deleteOtherSessions` | `requireAuth` |
| DELETE | `/api/user/sessions/:id` | `userController.deleteSession` | `requireAuth` |
| POST | `/api/user/2fa/enable` | `userController.enable2FA` | `requireAuth` |
| POST | `/api/user/2fa/verify` | `userController.verify2FA` | `requireAuth` |
| POST | `/api/user/2fa/disable` | `userController.disable2FA` | `requireAuth` |
| GET | `/api/user/drawings/` | `drawingsController.list` | `requireAuth` |
| POST | `/api/user/drawings/` | `drawingsController.create` | `requireAuth` |
| PUT | `/api/user/drawings/:id` | `drawingsController.update` | `requireAuth` |
| DELETE | `/api/user/drawings/:id` | `drawingsController.remove` | `requireAuth` |
| GET | `/api/user/chart-settings/` | `chartSettingsController.get` | `requireAuth` |
| PUT | `/api/user/chart-settings/` | `chartSettingsController.update` | `requireAuth` |
| POST | `/api/wallet/deposit` | `walletController.deposit` | `requireAuth` |
| POST | `/api/wallet/withdraw` | `walletController.withdraw` | `requireAuth` |
| POST | `/api/wallet/webhook` | `walletController.webhook` | нет (HMAC BetaTransfer) |
| GET | `/api/wallet/balance` | `walletController.balance` | `requireAuth` |
| GET | `/api/wallet/transactions` | `walletController.transactions` | `requireAuth` |
| POST | `/api/kyc/init` | `kycController.init` | `requireAuth` (CSRF skipped) |
| POST | `/api/kyc/webhook` | `kycController.webhook` | нет (HMAC Sumsub, raw body) |
| GET | `/api/instruments/` | `instrumentsController.handleList` | нет |
| PATCH | `/api/instruments/:id/payout` | `instrumentsController.handleUpdatePayout` | `requireAdmin` |
| PATCH | `/api/instruments/:id/toggle` | `instrumentsController.handleToggle` | `requireAdmin` |
| GET | `/api/quotes/candles` | `quotesController.candles` | `requireAuth` |
| GET | `/api/line/snapshot` | `lineController.snapshot` | `requireAuth` |
| GET | `/api/line/history` | `lineController.history` | `requireAuth` |
| GET | `/ws` | WebSocket upgrade | сессия: `authenticateWebSocket` → `session_token` |

**Админ-роутер:** `backend/src/modules/admin/admin.routes.ts` — тело пустое, маршрутов нет.

### 1.3 Модели БД (`backend/prisma/schema.prisma`)

- **User** — поля: `id`, `email`, `password`, `googleId`, `firstName`, `lastName`, `nickname`, `phone`, `country`, `dateOfBirth`, `avatarUrl`, `currency` (default `"UAH"`), `role` (`Role` default `USER`), `twoFactorSecret`, `twoFactorEnabled`, `twoFactorBackupCodes`, `kycStatus`, `kycApplicantId`, `isActive`, `createdAt`, `updatedAt`; связи `sessions`, `accounts`, `trades`, `transactions`, `drawings`, `chartSettings`.
- **Session** — `id`, `userId`, `tokenHash`, `expiresAt`, `userAgent`, `ipAddress`, `createdAt`.
- **Account** — `id`, `userId`, `type` (`DEMO`/`REAL`), `balance`, `currency`, `isActive`, timestamps; уникальность `(userId, type)`.
- **LedgerEntry** — `id`, `accountId`, `type` (`TRADE_DEBIT`, `TRADE_CREDIT`, `DEPOSIT`, `WITHDRAWAL`, `BONUS`, `REFUND`, `DEMO_RESET`), `amount`, `direction` (`CREDIT`/`DEBIT`), `balanceAfter`, `referenceId`, `referenceType`, `description`, `createdAt`.
- **Trade** — `id`, `userId`, `accountId`, `instrumentId`, `direction` (`CALL`/`PUT`), `amount`, `entryPrice`, `exitPrice`, `payoutPercent`, `payoutAmount`, `status` (`OPEN`/`WIN`/`LOSS`/`TIE`), `openedAt`, `expiresAt`, `closedAt`, `idempotencyKey` (unique optional).
- **Transaction** — `id`, `userId`, `accountId`, `type` (`DEPOSIT`/`WITHDRAWAL`), `status` (`PENDING`/`CONFIRMED`/`FAILED`), `amount`, `currency`, `paymentMethod`, `externalId`, `externalStatus`, `cardLastFour`, `failureReason`, `createdAt`, `confirmedAt`.
- **Instrument** — `id`, `name`, `base`, `quote`, `type` (`REAL`/`OTC`), `isActive`, `payoutPercent`, `sortOrder`, timestamps.
- **Candle** — `id`, `symbol`, `timeframe`, `timestamp`, `open`, `high`, `low`, `close`; unique `(symbol, timeframe, timestamp)`.
- **PricePoint** — `id`, `symbol`, `timestamp`, `price`; unique `(symbol, timestamp)`.
- **Drawing** — `id`, `userId`, `instrument`, `type`, `data` (Json), timestamps.
- **UserChartSettings** — `id`, `userId` (unique), `instrument`, `timeframe`, `chartType`, `indicators` (Json), timestamps.

### 1.4 WebSocket

**Подключение:** `GET /ws` в `backend/src/websocket/ws.routes.ts` — после `authenticateWebSocket` → `wsManager.addConnection`, первое сообщение клиенту: `{ type: "ws:ready", sessionId, serverTime }`. Heartbeat: сервер шлёт `ping`, клиент должен ответить `pong` (`ws.manager.ts`).

**Входящие JSON-сообщения** (`handleWsMessage` в `backend/src/websocket/ws.handler.ts`):

| `type` | Поведение |
|--------|-----------|
| `ping` | ответ `{ type: "pong" }` |
| `subscribe` | `instrument`, опционально `timeframe`; валидация таймфрейма из `VALID_TIMEFRAMES`; ответ `subscribed`, затем `chart:init` с данными |
| `unsubscribe` | снять подписку по `instrument` |
| `unsubscribe_all` | очистить подписки |

**Исходящие события (сервер → клиент):**

- `ws:ready`, `subscribed`, `error` (`sendError`: `{ type: "error", code, message }`).
- `chart:init` — после subscribe: свечи `priceProvider.getCandles`, активная свеча, цена, `marketOpen` / `marketStatus`, поля `nextMarketOpenAt: null`, `topAlternatives: []`.
- Бинарный тик: `encodePriceUpdate` в `websocket.bootstrap.ts` — байт `0x01`, длина имени инструмента, ASCII id, `float64` price, `float64` timestamp → `broadcastRawToInstrument`.
- JSON `price:update` — из `price:tick` в `websocket.bootstrap.ts`.
- `candle:close` — из `CandleAggregator` `candle:close`, рассылка `broadcastToInstrumentTimeframe`.
- `server:time` — раз в 1 с `broadcastAll`.
- `account.snapshot`, `trade:open`, `trade:close` — `backend/src/shared/websocket/ws.events.ts` (`sendAccountSnapshot`, `sendTradeOpen`, `sendTradeClose`).

### 1.5 Ценовой движок (OTC + Real)

**Сборка:** `bootstrapPrices()` в `backend/src/bootstrap/prices.bootstrap.ts` — активные инструменты из `instrumentRepository.findAllActive()`, `PriceEngineManager` + `CandleAggregator`, `initPriceProvider`.

**`PriceEngineManager`** (`backend/src/prices/PriceEngineManager.ts`):

- **OTC:** для каждого инструмента с `type === "OTC"` — `OtcPriceEngine`, случайное блуждание цены, конфиг из `OTC_INSTRUMENTS` в `backend/src/config/instruments.ts` или дефолт в `OtcPriceEngine.ts` (`initialPrice`, `minPrice`, `maxPrice`, `volatility`, `tickIntervalMs`).
- **REAL:** при непустом `process.env.XCHANGE_API_KEY` — `RealWebSocketHub` к `wss://api.xchangeapi.com/websocket/live` с заголовком `api-key`; маппинг пар из `REAL_INSTRUMENTS` (`pair` → внутренний `instrumentId`). Если ключа нет — real-инструменты пропускаются (лог warning).
- На каждый тик: `latestPrices`, emit `price:tick`, upsert в `PricePoint`.

**`priceProvider`** (`backend/src/prices/PriceProvider.ts`): `getPrice`, `getActiveCandle`, `getCandles` (память + БД).

**`RealPriceEngine`** (`backend/src/prices/engines/RealPriceEngine.ts`): класс есть, наследует `OtcPriceEngine`; в `PriceEngineManager` **не используется** (реальный поток — `RealWebSocketHub`).

### 1.6 Платежи BetaTransfer

**Сервис:** `backend/src/services/BetaTransferService.ts`  
- База API: константа `BETATRANSFER_BASE = "https://merchant.betatransfer.io/api"`.  
- Депозит: `createPayment` → `POST .../payment?token=<BETATRANSFER_PUBLIC_KEY>`, тело form-urlencoded, поля включая `orderId` = id транзакции в БД, `successUrl`/`failUrl` с `FRONTEND_URL` и `FRONTEND_DEFAULT_LOCALE`, подпись MD5 `createSign`.  
- Вывод: `createWithdrawal` → `POST .../withdrawal-payment?token=...`.  
- Webhook: `verifySignature(amount, order_id, sign)` — MD5 от `amount + order_id + BETATRANSFER_SECRET_KEY`.

**Домен:**  
- `deposit.service.ts` — лимиты 1–100000, только REAL-счёт, `transactionRepository.create` с `paymentMethod: "card"`, затем `createPayment`.  
- `withdraw.service.ts` — лимиты 10–50000, KYC `VERIFIED`, 2FA если включена (`verifyTotp`), max 3 pending withdrawal, списание баланса в транзакции, `createWithdrawal`, откат при ошибке.  
- `wallet.controller.ts` `webhook` — парсинг `webhookBodySchema` (`order_id`, `status`, `amount`, `sign`, …), статусы `confirmed`/`success` vs `failed`/`rejected`, `transactionRepository.confirmDeposit` / `confirmWithdrawal` / `failTransaction`, `sendAccountSnapshot`.

### 1.7 KYC Sumsub

**Сервис:** `backend/src/services/SumsubService.ts` — `BASE_URL = https://api.sumsub.com`, `LEVEL_NAME = "basic-kyc"`, подпись запросов HMAC-SHA256 (`SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`); методы `createApplicant`, `getAccessToken`, `verifyWebhookSignature` (HMAC-SHA256 от `SUMSUB_WEBHOOK_SECRET`).

**Домен:** `kyc.service.ts` — `initKyc`: при `VERIFIED` → conflict; создание applicant; `getAccessToken`; опционально `user.update` с `kycApplicantId`, `kycStatus: PENDING`. `handleWebhook`: по `applicantId` найти пользователя, при `reviewStatus === "completed"` выставить `VERIFIED` или `REJECTED` по `reviewResult.reviewAnswer === "GREEN"`.

**Контроллер:** `kyc.controller.ts` — webhook проверяет `x-payload-digest` против `rawBody` (hook `preParsing` в `app.ts` для `/api/kyc/webhook`).

### 1.8 Сделки: открытие и закрытие

**Открытие:** `tradeService.openTrade` в `backend/src/domain/trades/trade.service.ts`  
- Redis: idempotency ключ `idempotency:${key}`, активные сделки множество `active_trades:${userId}`, лимит `MAX_ACTIVE_TRADES` (20).  
- Проверки: инструмент, `isMarketOpen` для REAL, владение счётом, баланс, `priceProvider.getPrice` как `entryPrice`.  
- Атомарно: `tradeRepository.openTrade` (списание, создание trade, ledger `TRADE_DEBIT`).  
- Очередь: `getTradeClosingQueue().add("close-trade", { tradeId }, { jobId: close-${trade.id}, delay, attempts: TRADE_CLOSING_MAX_RETRIES, backoff })`.  
- WS: `sendTradeOpen`, `sendAccountSnapshot`.

**Закрытие:** `tradeClosingService.closeTrade` в `backend/src/domain/trades/trade-closing.service.ts`  
- `exitPrice` из `priceProvider.getPrice`, при ошибке — `TIE` с `exitPrice = entryPrice`.  
- Результат: `determineResult` / `calculatePayoutAmount` / `calculatePnl` в `trade.entity.ts` (`PRICE_EPSILON` в `trade.constants.ts`).  
- `tradeRepository.closeTrade` с условием `status === OPEN`.  
- WS: `sendTradeClose`, при необходимости `sendAccountSnapshot`; Redis `srem` активной сделки.

**Воркер:** `startTradeClosingWorker` в `backend/src/jobs/trade-closing.worker.ts` — очередь `TRADE_CLOSING_QUEUE` (`"trade-closing"`).

**Параметры открытия (валидация):** `openTradeBodySchema` в `backend/src/modules/trades/trades.schema.ts` — `accountId`, `direction` CALL/PUT, `amount` между `MIN_TRADE_AMOUNT`/`MAX_TRADE_AMOUNT` (1 / 50000), `expirationSeconds` из `ALLOWED_EXPIRATION_SECONDS` (5,10,15,30,60,120,180,300), `instrument`, опционально `idempotencyKey`.

### 1.9 Роли и права

- Prisma enum **`Role`:** `USER`, `ADMIN` (`User.role`).  
- **`requireAuth`:** `backend/src/middleware/auth.middleware.ts` — cookie `session_token`, поиск `Session` по SHA-256 хешу токена.  
- **`requireAdmin`:** `backend/src/middleware/admin.middleware.ts` — после `requireAuth` проверка `user.role === "ADMIN"`, выставляет `request.userRole = "ADMIN"`.  
- Использование admin: только `PATCH /api/instruments/:id/payout` и `PATCH /api/instruments/:id/toggle` (`instruments.routes.ts`).  
- Переменная **`ADMIN_EMAILS`** объявлена в `backend/src/shared/types/env.ts` и заполняется из env — **в коде вне `env.ts` не используется** (поиск по `backend/src`).

---

## 2. FRONTEND

**Стек:** Next.js App Router, `next-intl`, локали `ru`, `en`, `ua` (`frontend/i18n/routing.ts`, `localePrefix: 'always'`).

### 2.1 Роутинг (страницы `page.tsx`)

Путь шаблона: `frontend/app/[locale]/...`

| Файл страницы | Примечание |
|---------------|------------|
| `frontend/app/[locale]/page.tsx` | лендинг / модалки входа |
| `frontend/app/[locale]/login/page.tsx` | `redirect('/')` |
| `frontend/app/[locale]/register/page.tsx` | `redirect('/')` |
| `frontend/app/[locale]/terminal/page.tsx` | `TerminalPageContent` с `defaultAccount="real"` |
| `frontend/app/[locale]/terminal/demo/page.tsx` | демо-терминал |
| `frontend/app/[locale]/profile/page.tsx` | кабинет, табы query `tab` |
| `frontend/app/[locale]/assets/page.tsx` | активы |
| `frontend/app/[locale]/start/page.tsx` | старт |
| `frontend/app/[locale]/education/page.tsx` | обучение |
| `frontend/app/[locale]/reviews/page.tsx` | отзывы |
| `frontend/app/[locale]/about/page.tsx` | о проекте |
| `frontend/app/[locale]/policy/privacy/page.tsx` | политика |
| `frontend/app/[locale]/policy/terms/page.tsx` | условия |
| `frontend/app/[locale]/policy/aml-kyc/page.tsx` | AML/KYC |
| `frontend/app/[locale]/policy/risks/page.tsx` | риски |

**Middleware:** `frontend/middleware.ts` — `createMiddleware` из `next-intl`, matcher для локализованных путей.

**Корневой layout:** `frontend/app/layout.tsx`; локаль: `frontend/app/[locale]/layout.tsx` — `AuthProvider`, `ToastProvider`, `NextIntlClientProvider`.

### 2.2 Терминал

**Основной файл:** `frontend/app/[locale]/terminal/TerminalPageContent.tsx`  
Подключает: `ChartContainer`, `SentimentBar`, `IndicatorMenu`, `DrawingMenu`, `ChartTypeMenu`, `TimeframeMenu`, `InstrumentMenu`, `OverlayPanel`, `useOverlayRegistry`, `useTerminalSnapshot`, `useAccountSwitch`, `AuthGuard`, `NotificationsBell`, модалки `NewsModal`, `ChartSettingsModal`, `TimeSelectionModal`, `AmountCalculatorModal`, `TradesHistoryModal`, `CurrencyCountryModal`, `AccountSwitchModal`, `OnboardingTour`, `TradeCard` (через импорты в том же каталоге).

**Локальные компоненты терминала:**  
`frontend/app/[locale]/terminal/components/TradesHistoryModal.tsx`, `TimeSelectionModal.tsx`, `TradeCard.tsx`, `NewsModal.tsx`, `AmountCalculatorModal.tsx`, `ChartSettingsModal.tsx`, `loading.tsx`, `error.tsx`.

**Хук снимка:** `frontend/lib/hooks/useTerminalSnapshot.ts` → `GET /api/terminal/snapshot?instrument=...`.

**Лейаут:** `frontend/app/[locale]/terminal/layout.tsx`.

### 2.3 График

**Оркестратор:** `frontend/components/chart/useChart.ts` — связывает `useCanvasInfrastructure`, `useChartData`, `useViewport`, `useRenderLoop`, `useChartInteractions`, `useHistoryLoader`, `useCrosshair`, `useOhlcHover`, `useCandleCountdown`, `useCandleMode`, `useIndicators`, `useDrawings`, `useDrawingInteractions`, `useDrawingEdit`, `useCandleAnimator`, `useWebSocket`.

**Контейнер:** `frontend/components/chart/ChartContainer.tsx`.  
**Типы графика:** `ChartType = 'candles' | 'line'` (`frontend/components/chart/chart.types.ts`); компоненты-рефы: `frontend/components/chart/candle/CandleChart.tsx`, `frontend/components/chart/line/LineChart.tsx`.

**Режимы свечей:** `useCandleMode` — типы в `candleMode.types.ts`, в `useChart` параметр `candleMode`: `'classic' | 'heikin_ashi' | 'bars'`.

**Индикаторы:** тип `IndicatorType` в `frontend/components/chart/internal/indicators/indicator.types.ts`:  
`SMA`, `EMA`, `RSI`, `Stochastic`, `Momentum`, `AwesomeOscillator`, `BollingerBands`, `KeltnerChannels`, `Ichimoku`, `ATR`, `ADX`, `MACD`.  
Стартовый набор пресетов: `getAllIndicators()` в `indicatorRegistry.ts` (ema20, sma50, bb20, rsi14, stoch14, momentum10, ao, macd, keltner20, ichimoku, atr14, adx14).

**Рисунки:** `DrawingType` в `drawing.types.ts`: `horizontal`, `vertical`, `trend`, `rectangle`, `fibonacci`, `parallel-channel`, `ray`, `arrow`; режимы редактирования `DrawingEditMode` в том же файле.  
Меню: `DrawingMenu.tsx`, логика — `internal/drawings/useDrawings.ts`, `useDrawingInteractions.ts`, `useDrawingEdit.ts`.

### 2.4 Профиль

**Страница:** `frontend/app/[locale]/profile/page.tsx`  
Табы (`searchParams tab`): `profile`, `wallet`, `trade`, `support` (константы `PROFILE_NAV` в файле).  
- `profile` → `PersonalProfileTab` (внутри: `VerificationSection`, `SecuritySection`).  
- `wallet` → `WalletTab` (`frontend/components/profile/WalletTab.tsx`).  
- `trade` → `TradeProfileTab`.  
- `support` → `SupportTab`.  
KYC UI: `frontend/components/kyc/SumsubKyc.tsx` (импортируется в профиле/верификации по цепочке файла).

### 2.5 Авторизация (flow)

1. **`AuthProvider`** (`frontend/components/providers/AuthProvider.tsx`): при монтировании `checkAuth` → `authApi.me()` → `GET /api/auth/me` с `credentials: 'include'`.  
2. **Логин:** `authApi.login` → `POST /api/auth/login`; при `requires2FA` + `tempToken` — отдельный шаг `verify2FA` → `POST /api/auth/2fa`.  
3. **Регистрация:** `POST /api/auth/register`.  
4. **Выход:** `POST /api/auth/logout`, `clearCsrfToken`, сброс `useAccountStore`.  
5. **CSRF:** после успешного login/register сервер может вернуть `csrfToken` → `setCsrfToken`; иначе мутации берут токен через `GET /api/auth/csrf` (`frontend/lib/api/csrf.ts`).  
6. **Защита страниц:** `frontend/components/auth/AuthGuard.tsx` (используется в профиле и терминале).  
7. Маршруты `/login` и `/register` редиректят на `/`.

### 2.6 WebSocket хук

**Файл:** `frontend/lib/hooks/useWebSocket.ts`  
URL: на localhost:3000 → `ws://localhost:3001/ws`, иначе `window.location.origin` или fallback `NEXT_PUBLIC_API_URL` без хвоста `/api`.  
Исходящие: `subscribe` / `unsubscribe` / `unsubscribe_all`, `ping` (интервал 30 с).  
Обработка входящих в `processMessage`:  
`ws:ready`, `subscribed`, `unsubscribed`, `price:update`, `candle:close`, `candle:snapshot`, `chart:init`, `trade:open`, `trade:close`, `server:time`, `error`, **`account.snapshot`** → обновление `useAccountStore.setSnapshot`.  
Бинарные сообщения с префиксом `0x01` парсятся как компактный тик цены (согласованно с `encodePriceUpdate` на бэкенде).  
Тип `trade:countdown` объявлен в union `WsEvent`, **ветки обработки в `processMessage` нет**.

---

## 3. ИНТЕГРАЦИИ

### 3.1 Фронт ↔ бек

- **HTTP base URL:** `process.env.NEXT_PUBLIC_API_URL` — префикс для `api()` и CSRF (`frontend/lib/api/api.ts`, `frontend/lib/api/csrf.ts`). Пустая строка означает относительные пути к тому же origin.  
- **Cookies:** все запросы через `api()` с `credentials: 'include'` для сессии `session_token`.  
- **CSRF:** заголовок `x-csrf-token` на мутациях; при 403 — повтор с `refreshCsrfToken()`. Исключения на бэкенде — см. `CSRF_SKIP_PATHS` в `app.ts`.  
- **401:** для путей не из `AUTH_ENDPOINTS` — редирект на `/login` (`api.ts`).  
- **WebSocket:** см. §2.6; cookies уходят на тот же хост, что и WS URL.

### 3.2 Переменные окружения

**Backend** (`backend/src/shared/types/env.ts`, функция `env()`):

Обязательные при старте (`validateEnv`): `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`.

Остальные (с дефолтами, где указано):  
`NODE_ENV`, `PORT`, `FRONTEND_URL`, `SESSION_TTL_DAYS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `BETATRANSFER_MERCHANT_ID`, `BETATRANSFER_PUBLIC_KEY`, `BETATRANSFER_SECRET_KEY`, `BETATRANSFER_API_URL`, `FRONTEND_DEFAULT_LOCALE`, `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_WEBHOOK_SECRET`, `ADMIN_EMAILS` (список через запятую), `UPLOAD_DIR`, `MAX_FILE_SIZE`, `PRICE_PROVIDER_URL`, `PRICE_PROVIDER_API_KEY`, `XCHANGE_API_KEY`.

**Frontend (код):**  
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPPORT_CHANNEL_URL` (например в `TerminalPageContent.tsx`).

---

## 4. ЧТО НЕ РЕАЛИЗОВАНО / ЗАГЛУШКИ / TODO

| Наблюдение | Где в коде |
|------------|------------|
| Роутер админки без маршрутов | `backend/src/modules/admin/admin.routes.ts` — комментарий Phase 8, пустое тело |
| `RealPriceEngine` не подключён к менеджеру; помечен как заглушка | `backend/src/prices/engines/RealPriceEngine.ts` — комментарий TODO, наследование от OTC-движка |
| `ADMIN_EMAILS` не используется | только `backend/src/shared/types/env.ts` |
| `BETATRANSFER_MERCHANT_ID`, `BETATRANSFER_API_URL` в `env()`, в `BetaTransferService` не читаются | сравнить `env.ts` и `BetaTransferService.ts` |
| `PRICE_PROVIDER_URL`, `PRICE_PROVIDER_API_KEY` в `env()`, в ценовом коде не используются | grep по `backend/src` |
| `GOOGLE_*` в `env()` — OAuth-роутов в модулях нет | поле `User.googleId` в схеме есть, флоу в репозитории не найден по маршрутам |
| WS-событие `trade:countdown` не эмитится с бэкенда; на фронте нет обработчика | `useWebSocket.ts` только тип в union |
| События `candle:update` / `candle:snapshot` в типах фронта есть; на бэкенде в `websocket.bootstrap.ts` эмитятся только `price:update`, `candle:close`, `server:time` + user events | `ws.handler.ts` отдаёт `chart:init` при subscribe |
| Ошибка WS: бэкенд шлёт `code` + `message`; тип фронта для `error` — в основном `message` | `ws.handler.ts` `sendError` vs `WsEvent` в `useWebSocket.ts` |

**TODO в исходниках проекта (без node_modules):**  
`backend/src/prices/engines/RealPriceEngine.ts` — строка TODO про замену на реального провайдера.

**Сид:** `backend/prisma/seed.ts` — только инструменты, пользователей/админов не создаёт.

---

*Файл сгенерирован как снимок структуры кода; при изменении репозитория его нужно обновлять вручную или перегенерировать.*
