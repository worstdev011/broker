# KYC и верификация (Sumsub) в COMFORTRADE

Документ описывает, **как устроена идентификация клиента (KYC)** в этом репозитории: где хранится статус, как подключён **Sumsub**, какие есть HTTP-эндпоинты, как фронт встраивает WebSDK и где статус **реально влияет** на продукт.

---

## 1. Модель данных (Prisma / PostgreSQL)

В модели пользователя (`User` → таблица `users`) за KYC отвечают два поля:

| Поле | Тип | Назначение |
|------|-----|------------|
| `kycStatus` | `String?` | Логический статус верификации на стороне платформы |
| `kycApplicantId` | `String?` | ID аппликанта в Sumsub (после успешного создания) |

Файл схемы: `backend/prisma/schema.prisma`.

### Значения `kycStatus`, которые код осмысленно обрабатывает

- **`null` или отсутствует** — пользователь ещё не проходил KYC через текущий поток (или статус не синхронизирован).
- **`pending`** — заявка на рассмотрении / документы отправлены.
- **`verified`** — проверка пройдена (в коде это «можно считать клиента верифицированным»).
- **`rejected`** — отказ в верификации.

Строки задаются **вручную в коде** (не enum в БД): см. `backend/src/modules/kyc/kyc.controller.ts`.

Публичный ответ API **не отдаёт пароль**, но **отдаёт** `kycStatus` и `kycApplicantId` в составе пользователя через `toAuthUserPublic` в `backend/src/domain/auth/AuthService.ts` (поле `password` вырезается, вместо него `hasPassword`).

---

## 2. Sumsub: зачем и что используется

**Sumsub** — внешний провайдер KYC. Здесь он используется так:

1. Бэкенд создаёт **аппликанта** в Sumsub с `externalUserId`, равным **внутреннему ID пользователя платформы** (строка, у вас это 8-значный numeric id).
2. Бэкенд запрашивает **короткоживущий access token** для **WebSDK** (~10 минут).
3. Браузер грузит скрипт Sumsub и открывает iframe-поток проверки.
4. Sumsub шлёт **вебхуки** на ваш бэкенд; обработчик обновляет `kycStatus` в БД.

### Уровень проверки (level)

В коде зашито имя уровня Sumsub:

- **`basic-kyc`**

Константа: `LEVEL_NAME` в `backend/src/services/sumsub.ts`.

Этот level **должен существовать** в кабинете Sumsub и быть привязан к нужному сценарию проверки. Если имя не совпадёт, API Sumsub вернёт ошибку.

### Аутентификация запросов к Sumsub API

Клиент в `backend/src/services/sumsub.ts` подписывает каждый запрос по документации Sumsub:

- заголовки `X-App-Token`, `X-App-Access-Ts`, `X-App-Access-Sig`;
- HMAC-SHA256 от строки `timestamp + METHOD + path + body` с секретом **`SUMSUB_SECRET_KEY`**.

Базовый URL API: `https://api.sumsub.com`.

### Верификация вебхука

В `verifyWebhookSignature` используется **`WEBHOOK_SECRET_KEY`**: HMAC-SHA256 от **сырого тела** запроса, результат сравнивается с заголовком **`X-Payload-Digest`** (сравнение через `timingSafeEqual`).

Важно: секрет вебхука в Sumsub и переменная **`WEBHOOK_SECRET_KEY`** в `.env` должны **совпадать** с тем, как настроено в кабинете Sumsub для данного webhook.

---

## 3. Переменные окружения (backend)

Читаются в `backend/src/config/env.ts`:

| Переменная | Назначение |
|------------|------------|
| `SUMSUB_APP_TOKEN` | App token из кабинета Sumsub |
| `SUMSUB_SECRET_KEY` | Секрет для подписи **исходящих** запросов к API Sumsub |
| `WEBHOOK_SECRET_KEY` | Секрет для проверки подписи **входящих** вебхуков |

Если что-то из этого не задано, приложение **всё равно стартует**, но в лог пишется предупреждение, а вызовы KYC/Sumsub на практике будут падать.

---

## 4. HTTP API бэкенда

Регистрация роутов: `backend/src/modules/kyc/kyc.routes.ts`, подключение в `backend/src/app.ts` (`registerKycRoutes`).

### `POST /api/kyc/init`

**Назначение:** создать аппликанта (если ещё нет) и вернуть `{ token, applicantId }` для запуска WebSDK.

Тело JSON:

```json
{ "userId": "<id пользователя платформы>" }
```

Поведение (`backend/src/modules/kyc/kyc.controller.ts`):

1. `createApplicant(userId)` → Sumsub `POST /resources/applicants?levelName=basic-kyc` с `{ externalUserId: userId }`.
2. Если Sumsub отвечает **409** (аппликант уже есть) — ошибка игнорируется, идём дальше.
3. `getAccessToken(userId)` → `POST /resources/accessTokens?userId=...&levelName=basic-kyc`.
4. Если на шаге 1 был получен `applicantId`, в БД делается `user.update`: выставляются `kycApplicantId` и **`kycStatus: 'pending'`**.

**CSRF:** путь **не** входит в `CSRF_SKIP_PATHS`, значит с фронта нужен валидный `csrf-token` (как и для прочих POST), см. `backend/src/app.ts`.

**Важно по безопасности:** в текущей реализации **`userId` берётся из тела запроса**. Роут **не сравнивает** его с сессией. На практике фронт передаёт id залогиненного пользователя (`VerificationTab` + `useAuth`), но с точки зрения API это доверенный вызов из браузера с CSRF. Для усиления защиты имеет смысл в будущем брать `userId` только из аутентифицированной сессии.

### `POST /api/kyc/webhook`

**Назначение:** приём событий от Sumsub и обновление `users.kycStatus`.

Особенности реализации:

- Путь добавлен в **`CSRF_SKIP_PATHS`**, потому что запрос идёт **с серверов Sumsub**, без вашего CSRF-токена.
- Для этого роута зарегистрирован **отдельный content-type parser**: тело парсится как **Buffer**, копия кладётся в `req.raw['rawBody']`, затем JSON парсится в `request.body`. Это нужно, чтобы HMAC считался от **тех же байт**, что и у Sumsub.

Обрабатываемые типы событий (поле `type` в JSON):

| `type` | Действие в БД |
|--------|----------------|
| `applicantReviewed` | Смотрится `reviewResult.reviewAnswer`: `GREEN` → `kycStatus = 'verified'`, `RED` → `'rejected'`; опционально обновляется `kycApplicantId` |
| `applicantPending` / `applicantOnHold` | `kycStatus = 'pending'` |

Обновление пользователя идёт по **`externalUserId`** из payload вебхука — это тот же id, что вы передавали как `userId` при создании аппликанта.

Публичный URL вебхука в проде должен указывать на **доступный из интернета** бэкенд, например `https://<api-host>/api/kyc/webhook` (или через прокси с тем же путём).

### Вспомогательная функция API (не используется роутами сейчас)

В `backend/src/services/sumsub.ts` есть **`getApplicantStatus(applicantId)`** — опрос статуса у Sumsub. В текущих роутерах **нет** эндпоинта, который бы её вызывал; актуализация статуса рассчитана на **вебхуки**.

---

## 5. Фронтенд: где показывается KYC

### Компонент WebSDK

**Файл:** `frontend/components/kyc/SumsubKyc.tsx`

- Подгружает скрипт: `https://static.sumsub.com/idensic/static/sns-websdk-builder.js`
- Вызывает `kycApi.init(userId)` → `POST /api/kyc/init`
- Запускает SDK в контейнере `#sumsub-container`
- Передаёт **`tokenExpirationHandler`**: при истечении токена снова вызывается `/api/kyc/init`

Опционально: `lang`, `country` (ISO-код для предвыбора в SDK).

### Вкладка «Верификация» в профиле

**Файл:** `frontend/components/profile/VerificationTab.tsx` (экспорт `VerificationSection`)

Пошаговый UX:

1. Intro → 2. Выбор страны из фиксированного списка → 3. Запуск `SumsubKyc` с `user.id` → 4. Состояния pending / verified / rejected.

Колбэки SDK:

- **`onStepCompleted`** → локально ставит статус `pending` + `localStorage` (`profile-verification-status`).
- **`onApplicantStatusChanged`** → по `reviewAnswer` GREEN/RED или `reviewStatus` pending/onHold обновляет локальный UI и `localStorage`.

### Хук статуса KYC

**Файл:** `frontend/lib/hooks/useVerification.ts`

- **`useVerificationStatus()`** — возвращает `'none' | 'pending' | 'verified' | 'rejected'`:
  - сначала читает `localStorage` (`VERIFICATION_STORAGE_KEY` = `profile-verification-status`);
  - на mount запрашивает **`GET /api/user/profile`** и синхронизирует с полем **`user.kycStatus`**;
  - слушает `storage` (другие вкладки) и кастомное событие **`profile-updated`** (если в `detail` есть `kycStatus`).

- **`useIsVerified()`** — `true` только если статус строго **`verified`**.

Событие **`profile-updated`** диспатчится, в частности, из `frontend/app/[locale]/profile/page.tsx` и `SecurityTab` при обновлении профиля — если в ответе API приходит актуальный `user`, туда может входить и `kycStatus`.

### Где статус влияет на продукт

- **`frontend/components/profile/WalletTab.tsx`**: используется **`useIsVerified()`**. Без **`verified`** пользователь видит ограничения вокруг **вывода** (баннер про необходимость KYC, вкладка вывода недоступна до верификации — см. условия рендера с `isVerified`).

### Где статус пока не используется

- В **`frontend/app/[locale]/terminal/page.tsx`** вызывается `useVerificationStatus()`, результат кладётся в переменную **`kycStatus`**, но **ниже по файлу она не используется** (мертвый код / задел под будущий бейдж или блокировку — на момент описания документа UI терминала от KYC не зависит).

---

## 6. Юридические / маркетинговые страницы

Статическая политика **AML/KYC** для пользователей:

- `frontend/app/[locale]/policy/aml-kyc/page.tsx` (+ `layout.tsx` с метаданными)

В футере и на лендингах есть ссылки на эту страницу (`Footer`, `page.tsx`, `start`, `education`, и т.д.) — это **контент**, не интеграция Sumsub.

---

## 7. Краткий поток «от клика до статуса в БД»

1. Пользователь в профиле нажимает пройти верификацию → `VerificationTab` → `SumsubKyc`.
2. Фронт: `POST /api/kyc/init` с `{ userId }` и CSRF.
3. Бэкенд: создаёт аппликанта в Sumsub (или 409), выдаёт token, при новом аппликанте пишет в БД `kycApplicantId` + `pending`.
4. Браузер: WebSDK Sumsub, загрузка документов.
5. Sumsub после ревью шлёт webhook на `/api/kyc/webhook`.
6. Бэкенд проверяет подпись, выставляет `kycStatus` = `verified` или `rejected` (или `pending` для промежуточных типов событий).
7. Фронт при следующем `GET /api/user/profile` или через обновление профиля / события видит новый статус; `WalletTab` разрешает вывод только при **`verified`**.

---

## 8. Чеклист для нового окружения

- [ ] В Sumsub создан level **`basic-kyc`** (или изменить константу в коде под ваш level).
- [ ] Заданы `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `WEBHOOK_SECRET_KEY` в `.env` бэкенда.
- [ ] В Sumsub настроен webhook на публичный URL **`POST .../api/kyc/webhook`** с тем же секретом, что `WEBHOOK_SECRET_KEY`.
- [ ] Прогнать тестовый аппликант и убедиться, что в `users` обновляются `kycStatus` / `kycApplicantId`.

---

*Документ сгенерирован по текущему состоянию репозитория; при изменении роутов или уровня Sumsub обновляйте этот файл или код.*
