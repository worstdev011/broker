# Авторизация в Comfortrade: полная схема и куда «вкручивать» Google

Документ для ориентира: как сейчас устроен вход, где какие файлы, и **куда логично подключать Sign in with Google**, не ломая cookie-сессии и CSRF.

---

## 1. Общая модель (важно для Google)

Сейчас авторизация — **не JWT в localStorage**, а **серверная сессия**:

1. После успешного входа/регистрации бэкенд выставляет **httpOnly signed cookie** `session` с длинным случайным токеном.
2. В PostgreSQL в таблице `sessions` хранится **SHA-256 хэш** этого токена (не сам токен).
3. Фронт ходит в API с **`credentials: 'include'`**, чтобы cookie уезжала на каждый запрос.
4. В **production** фронт и API часто на разных доменах; в **dev** Next проксирует `/api/*` на бэкенд, поэтому для браузера всё выглядит как **один origin** — cookie работают предсказуемо.

**Вывод для Google:** после того как Google подтвердил личность пользователя, тебе всё равно нужно на **своём бэкенде** создать ту же **сессию** (`Session` + `Set-Cookie: session=...`), что и после обычного `login`. Иначе остальной сайт (терминал, профиль, WebSocket) не узнает пользователя.

---

## 2. Поток данных: фронт → Next → Fastify

| Слой | Роль |
|------|------|
| **Браузер** | `fetch('/api/...', { credentials: 'include' })` — относительные URL идут на **тот же хост**, что и Next (например `localhost:3000`). |
| **`frontend/next.config.js`** | `rewrites`: `/api/:path*` → `API_BACKEND_URL` / `http://localhost:3001/api/:path*`. Cookie `session` привязывается к **домену страницы** (Next), но ответ `Set-Cookie` приходит от **проксируемого** бэкенда — в типичной настройке путь `/`, домен совпадает с сайтом. |
| **Fastify** | Реальные обработчики `/api/auth/*`, выставление cookie, CSRF, CORS. |

Файл: `frontend/next.config.js` — секция `rewrites`.

**Важно:** WebSocket (`/ws`) **не** проксируется через Next в этом конфиге; клиент подключается к порту бэкенда или к origin — см. `frontend/lib/hooks/useWebSocket.ts`.

---

## 3. Бэкенд: маршруты авторизации

Файл регистрации роутов: `backend/src/modules/auth/auth.routes.ts`.

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/auth/csrf` | Выдать `{ csrfToken }`, выставить CSRF-cookie |
| POST | `/api/auth/register` | Регистрация email+password → 201, cookie сессии + `csrfToken` в JSON |
| POST | `/api/auth/login` | Логин email+password → либо `{ user, csrfToken }` + cookie, либо **без cookie** `{ requires2FA: true, tempToken }` |
| POST | `/api/auth/2fa` | Второй шаг: `{ tempToken, code }` → cookie сессии + `csrfToken` |
| POST | `/api/auth/logout` | Сброс сессии и cookie |
| GET | `/api/auth/me` | Текущий пользователь по cookie |

Контроллер: `backend/src/modules/auth/auth.controller.ts` — там **`setSessionCookie`**, **`clearSessionCookie`**, ветка 2FA без cookie на первом шаге.

Доменная логика: `backend/src/domain/auth/AuthService.ts` — `register`, `login`, `verifyLogin2FA`, `logout`, `getMe`.

**Google сейчас на бэкенде отсутствует** — нет ни `/api/auth/google`, ни callback. Это нормально: это следующий этап разработки.

---

## 4. CSRF (как это связано с Google)

В `backend/src/app.ts`:

- Для **POST/PUT/PATCH/DELETE** (кроме исключений) требуется заголовок **`csrf-token`**, согласованный с CSRF-cookie.
- В **`CSRF_SKIP_PATHS`** явно перечислены: `/api/auth/register`, `/api/auth/login`, `/api/auth/2fa`, `/api/auth/logout`, `/api/kyc/webhook`.

Поэтому **первичный логин/регистрация** не требуют заранее иметь CSRF в заголовке.

**Для нового OAuth-флоу типично делают так:**

- **Вариант A (редирект):** `GET /api/auth/google` редиректит на Google (без тела JSON → CSRF на этот GET обычно не вешают). Callback `GET /api/auth/google/callback?code=...&state=...` — обмен `code` на токены на сервере, создание/поиск пользователя, **`setSessionCookie`**, редирект на фронт. Для `state` используют **секрет в cookie или Redis**, не CSRF double-submit.
- **Вариант B (код с фронта):** Google Identity Services отдаёт **id_token** в браузере → фронт шлёт `POST /api/auth/google` с `{ credential }` — тогда этот POST должен быть либо в **CSRF_SKIP** (хуже), либо клиент сначала дергает **`GET /api/auth/csrf`** и шлёт заголовок (как сейчас для остальных мутаций).

Рекомендация: **вариант A (серверный redirect + callback)** лучше ложится на текущую модель «всё решает бэкенд и одна cookie сессии».

---

## 5. Временный токен 2FA (логин в два шага)

Файл: `backend/src/utils/tempTokens.ts`.

- После успешного **пароля**, если у пользователя включена 2FA, в **Redis** кладётся связка `temp_token:{random}` → `userId`, TTL 5 минут.
- Клиент получает **только** opaque `tempToken` (hex).
- `POST /api/auth/2fa` съедает токен **один раз** (`verifyTempToken` делает `GET` + `DEL`).

Сервис: `AuthService.login` / `verifyLogin2FA`.

**Google и 2FA:** если пользователь завёл аккаунт через Google без пароля, а потом включил 2FA, второй фактор на **следующем входе** нужно вешать на **тот же механизм** (после успешной Google-аутентификации не выдавать сессию сразу, а выдать `tempToken` и спросить TOTP) — логика уже есть в `login`, её нужно **повторить в ветке «успешный Google»** до `setSessionCookie`.

---

## 6. Модель пользователя в БД (важно для Google)

Файл: `backend/prisma/schema.prisma`, модель `User`.

- **`email`** — unique.
- **`password`** — строка; для чистого OAuth часто делают **случайный неиспользуемый хэш** или миграцию на `password String?` (nullable), чтобы не хранить фиктивный пароль в открытом виде.
- Полезно добавить для Google: **`googleId String? @unique`** (или `provider` + `providerAccountId`) — чтобы связать аккаунт Google с одной записью `User` и не плодить дубликаты по email.

Сейчас **`googleId` нет** — при внедрении OAuth понадобится миграция и обновление `UserRepository` / `AuthService`.

---

## 7. Фронтенд: где живёт логин и что вызывается

### 7.1. Хук `useAuth`

Файл: `frontend/lib/hooks/useAuth.ts`.

| Метод | Что делает |
|-------|------------|
| `checkAuth` | На монтировании: `GET /api/auth/me` → выставляет `user` / `isAuthenticated` |
| `login(email, password)` | `authApi.login` → при успехе обновляет state; при 2FA возвращает `{ success: false, requires2FA: true, tempToken }` **без ошибки** |
| `verify2FA(tempToken, code)` | `authApi.verify2FA` → `POST /api/auth/2fa`, потом state с `user` |
| `register` | `authApi.register` |
| `logout` | `authApi.logout`, чистит CSRF кэш |

### 7.2. HTTP-клиент

Файл: `frontend/lib/api/client.ts`.

- **`authApi.login`**, **`authApi.verify2FA`**, и т.д. — обёртки над **`apiRequest`**.
- **`apiRequest`** только в **`window`** (не на SSR).
- **`credentials: 'include'`** — обязательно для cookie.
- На **POST** (кроме logout) подмешивается **`csrf-token`** из `getCsrfToken()` (`frontend/lib/api/csrf.ts`), который бьёт в **`GET /api/auth/csrf`** или берётся из ответа после login/register.

Отдельно есть **`frontend/lib/api/api.ts`** — функция **`api()`** с похожей логикой (профиль, кошелёк); для auth основной путь — **`authApi`** в `client.ts`.

### 7.3. Страница «логин»

Файл: `frontend/app/[locale]/login/page.tsx` — **только** `redirect('/')`.  
Реальная форма входа/регистрации — **модалка на главной**.

### 7.4. Главная: email, пароль, 2FA

Файл: `frontend/app/[locale]/page.tsx`, компонент **`HomeContent`**.

- Состояние: `loginTempToken`, `loginAwaiting2FA`, `twoFACode`.
- Первый шаг: `login(email, password)` → если `requires2FA`, сохраняется **`setLoginTempToken(result.tempToken)`**, показывается UI ввода кода.
- Второй шаг: **`verify2FA(loginTempToken, twoFACode)`** внутри `handleFormSubmit`.

Именно **сюда** логично добавить обработчик кнопки Google (или редирект на URL бэкенда).

---

## 8. Кнопка «Продолжить с Google» — что есть сейчас

В **`page.tsx`** (и на других маркетинговых страницах) кнопка выглядит как Google, но это **обычный `<button type="button">` без `onClick`** — декоративная заглушка.

Пример (фрагмент):

```tsx
<button
  type="button"
  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl ..."
>
  <svg>...</svg>
  {tc('continue_with_google')}
</button>
```

Текст перевода: `common.continue_with_google` в `frontend/messages/*.json`.

**Чтобы кнопка заработала**, нужно **либо**:

1. **`onClick`** → `window.location.href = '/api/auth/google'` (если бэкенд отдаёт редирект на Google и потом callback выставляет cookie и редиректит на `/terminal`),  
2. **либо** открыть popup / использовать Google Identity Services и потом **`POST`** на новый эндпоинт с `id_token` (тогда продумать CSRF и ответ в том же формате, что `login` — cookie + при необходимости `csrfToken` в JSON).

---

## 9. Рекомендуемый план внедрения Google (в стиле текущего проекта)

Ниже — ориентир, **не готовый код**, а порядок работ и точки касания.

### Шаг 1 — Google Cloud Console

- Создать **OAuth 2.0 Client ID** (Web application).
- **Authorized redirect URIs** — например:
  - dev: `http://localhost:3001/api/auth/google/callback` (если callback висит на бэкенде напрямую),  
  - или через Next proxy: `http://localhost:3000/api/auth/google/callback` — тогда Fastify должен видеть тот же путь (rewrite уже есть).
- Сохранить **Client ID** и **Client Secret** в `backend/.env` (не коммитить).

### Шаг 2 — Бэкенд: зависимости и env

- Библиотека обмена `code` на токен (например `openid-client` или ручной `fetch` к `https://oauth2.googleapis.com/token`).
- Переменные: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (или собрать из `FRONTEND_URL` / `PORT`).

### Шаг 3 — Бэкенд: новые маршруты

Предлагаемая пара:

1. **`GET /api/auth/google`**  
   - Генерирует **state** (случайная строка), кладёт в **Redis** или подписанную cookie с коротким TTL.  
   - Редирект на `https://accounts.google.com/o/oauth2/v2/auth?...&state=...`

2. **`GET /api/auth/google/callback?code=...&state=...`**  
   - Проверяет `state`.  
   - Меняет `code` на access/id token.  
   - Достаёт **email** (и желательно `sub` — стабильный Google user id).  
   - **Найти или создать `User`:**
     - если есть `googleId` / email — логин существующего;
     - иначе создать пользователя (как в `register` — demo+real счета через `AccountService`, если это поведение нужно и для соцвхода).  
   - Если у пользователя **2FA** — **не** вызывать `setSessionCookie` сразу; вернуть редирект на фронт с **одноразовым кодом в query** опасно — лучше снова использовать **Redis temp token** и редирект на `/?google2fa=1&tempToken=...` **или** промежуточную страницу. Проще всего: положить в Redis `temp_token` как при парольном логине и редиректить на главную с **фрагментом или query**, чтобы фронт показал только поле 2FA (аналог текущего `loginAwaiting2FA`).  
   - Если 2FA нет — **`createSession`** + **`setSessionCookie`** + **`generateCsrf`** и редирект на `FRONTEND_URL/terminal` (или на локальный `/terminal`).

3. **CSRF:** добавить callback path в политику (GET обычно не требует CSRF тела; главное — проверка `state`).

### Шаг 4 — Prisma

- Миграция: `googleId` (и при необходимости `password` optional).
- Обновить `PrismaUserRepository` / создание пользователя.

### Шаг 5 — Фронт

- На кнопке Google:  
  `onClick={() => { window.location.href = `${base}/api/auth/google` }}`  
  где `base` — пустая строка при rewrite (тот же origin) или `NEXT_PUBLIC_API_URL`.
- Опционально: обработка возврата с ошибкой `?error=google_denied` для `toast` / текста ошибки.

### Шаг 6 — Связка аккаунтов

- Если пользователь уже есть с **тем же email**, но заведён по паролю — решить политику: **привязать Google** (записать `googleId`) после подтверждения пароля **или** запретить и показать «войдите по паролю». Это продуктовое решение, не техническое.

---

## 10. Чеклист файлов «куда крутить»

| Задача | Где смотреть / менять |
|--------|------------------------|
| Новые URL OAuth | `backend/src/modules/auth/auth.routes.ts` + новый метод в `auth.controller.ts` |
| Создание сессии как сейчас | `AuthService` — вынести общий метод «issue session after user id known» или дублировать вызовы `createSession` |
| Cookie | `backend/src/infrastructure/auth/CookieAuthAdapter.ts` |
| Пользователь в БД | `prisma/schema.prisma`, `PrismaUserRepository`, `AuthService` |
| CSRF список | `backend/src/app.ts` → `CSRF_SKIP_PATHS` при необходимости |
| Кнопка Google в модалке | `frontend/app/[locale]/page.tsx` (и дубликаты на `about`, `assets`, … если нужна та же логика) |
| Редирект после входа | Сейчас `useEffect` на `isAuthenticated` → `/terminal` в `page.tsx`; после OAuth редирект с бэкенда может сразу вести в `/terminal` |
| Проверка «залогинен ли» | `useAuth` + `GET /api/auth/me` |

---

## 11. Краткая схема текущего логина (email + пароль + 2FA)

```
[Фронт: модалка на /]
       POST /api/auth/login { email, password }
       (без CSRF в skip — ок)
              │
              ▼
[AuthService.login]
       пароль верный?
              │
     ┌────────┴────────┐
     │ 2FA включена    │ нет 2FA
     ▼                 ▼
 Redis tempToken    createSession + cookie
     │                 │
     ▼                 ▼
 ответ JSON         ответ JSON
 requires2FA        user + csrfToken
     │
     ▼
[Фронт] ввод 6 цифр → POST /api/auth/2fa { tempToken, code }
              │
              ▼
 verifyLogin2FA → createSession + cookie + csrfToken
```

**Google** должен в итоге сойти к той же точке: **известен `userId` (или создан пользователь)** → дальше либо **tempToken + 2FA**, либо сразу **session cookie**.

---

*Документ отражает состояние репозитория на момент написания. После правок кода сверяйте пути и имена эндпоинтов с актуальными файлами.*
