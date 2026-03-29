# COMFORTRADE PARTNERS — Мастер-документ
## Партнёрская программа (MVP)

---

## 0. ВАЖНО: КАК ЧИТАТЬ ЭТОТ ДОКУМЕНТ

Это конституция партнёрки. Перед написанием любого кода читать полностью.

Принципы:
- Партнёрка — отдельное Next.js приложение в папке `partners/`
- Деплоится на отдельный домен (`partners.comfortrade.com`)
- Использует тот же бэкенд через новые `/api/partners/*` эндпоинты
- RevShare модель: партнёр получает 50% от прибыли брокера с каждого реферала
- MVP — только самое необходимое, без лишнего

---

## 1. КАК РАБОТАЕТ ПАРТНЁРКА (БИЗНЕС-ЛОГИКА)

### 1.1 Регистрация партнёра
1. Партнёр регистрируется на `partners.comfortrade.com`
2. Создаётся аккаунт партнёра (отдельная сущность, не User)
3. Автоматически генерируется уникальный реф-код (8 символов: A-Z0-9)
4. Реферальная ссылка: `comfortrade.com?ref=ABCD1234`
5. Статус по умолчанию: ACTIVE (без одобрения, MVP)

### 1.2 Отслеживание кликов
1. Пользователь переходит по ссылке `comfortrade.com?ref=ABCD1234`
2. На основном сайте: cookie `ref_code` = `ABCD1234`, TTL 30 дней
3. Записывается клик в таблицу `partner_clicks`

### 1.3 Регистрация реферала
1. Пользователь регистрируется на основном сайте
2. При регистрации: если есть cookie `ref_code` → привязать пользователя к партнёру
3. Записать в `User.partnerId` = id партнёра
4. Записать событие `REGISTRATION` в `partner_events`
5. Cookie очищается после привязки

### 1.4 FTD (First Time Deposit — первый депозит)
1. Реферал делает первый депозит (confirmed webhook)
2. Записать событие `FTD` в `partner_events`
3. FTD — ключевая метрика для партнёра

### 1.5 RevShare начисление
Начисляется каждый раз когда реферал ПРОИГРЫВАЕТ сделку:

```
Реферал поставил 100 UAH
Реферал проиграл → брокер заработал 100 UAH
RevShare 50% → партнёр зарабатывает 50 UAH
```

Начисление происходит в `trade-closing.service.ts` при результате LOSS:
```
partnerRevshare = trade.amount * (partner.revsharePercent / 100)
```

Записать в `partner_earnings` и обновить `partner.balance`.

### 1.6 Вывод средств партнёром
MVP: партнёр создаёт запрос на вывод, ты выплачиваешь вручную.
Статус: PENDING → PAID (вручную через админку).
Минимум для вывода: 500 UAH.

---

## 2. АРХИТЕКТУРА

```
partners/                       ← отдельное Next.js приложение
├── app/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── page.tsx                ← redirect → /dashboard
│   ├── dashboard/page.tsx      ← главная статистика
│   ├── referrals/page.tsx      ← список рефералов
│   └── withdrawals/page.tsx    ← запросы на вывод
├── components/
│   ├── PartnersAuthProvider.tsx
│   ├── PartnersGuard.tsx
│   └── layout/
│       ├── PartnersSidebar.tsx
│       └── PartnersTopBar.tsx
├── lib/
│   └── api/partners-api.ts
└── types/
    └── partners.ts
```

---

## 3. БАЗА ДАННЫХ — НОВЫЕ ТАБЛИЦЫ

### 3.1 Таблица `partners`
```
id              String    PK (cuid)
email           String    UNIQUE NOT NULL
password        String    (bcrypt hash)
firstName       String?
lastName        String?
telegramHandle  String?
refCode         String    UNIQUE (8 символов A-Z0-9, генерируется автоматически)
status          Enum      ACTIVE | SUSPENDED | PENDING
revsharePercent Int       DEFAULT 50
balance         Decimal   @db.Decimal(18,2) DEFAULT 0  (накопленный заработок)
totalEarned     Decimal   @db.Decimal(18,2) DEFAULT 0  (всего заработано за всё время)
createdAt       DateTime  DEFAULT now()
updatedAt       DateTime  @updatedAt
```

### 3.2 Таблица `partner_clicks`
```
id          String    PK (cuid)
partnerId   String    FK → partners.id
ip          String?
userAgent   String?
referer     String?   (откуда пришёл)
createdAt   DateTime  DEFAULT now()
INDEX(partnerId, createdAt)
```

### 3.3 Таблица `partner_events`
```
id          String    PK (cuid)
partnerId   String    FK → partners.id
userId      String    FK → users.id (реферал)
type        Enum      REGISTRATION | FTD | DEPOSIT
amount      Decimal?  @db.Decimal(18,2) (сумма депозита для FTD/DEPOSIT)
createdAt   DateTime  DEFAULT now()
INDEX(partnerId, type, createdAt)
INDEX(userId)
```

### 3.4 Таблица `partner_earnings`
```
id          String    PK (cuid)
partnerId   String    FK → partners.id
userId      String    FK → users.id (реферал чья сделка)
tradeId     String    FK → trades.id
amount      Decimal   @db.Decimal(18,2) (сколько заработал партнёр)
createdAt   DateTime  DEFAULT now()
INDEX(partnerId, createdAt)
INDEX(tradeId) UNIQUE (один earning на одну сделку)
```

### 3.5 Таблица `partner_withdrawals`
```
id          String    PK (cuid)
partnerId   String    FK → partners.id
amount      Decimal   @db.Decimal(18,2)
status      Enum      PENDING | PAID | REJECTED
paymentMethod String? (реквизиты — карта, крипто и тд)
note        String?   (комментарий при отклонении)
createdAt   DateTime  DEFAULT now()
paidAt      DateTime?
INDEX(partnerId, status)
```

### 3.6 Обновление таблицы `users`
Добавить поле:
```
partnerId   String?   FK → partners.id (если пришёл по реф ссылке)
INDEX(partnerId)
```

---

## 4. БЭКЕНД — ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩЕМ КОДЕ

### 4.1 Основной сайт — регистрация с ref кодом

В `POST /api/auth/register`:
- Принять опциональный параметр `refCode?: string` в body
- Если `refCode` передан → найти партнёра по `refCode`
- Если партнёр найден и ACTIVE → установить `user.partnerId = partner.id`
- Записать событие `REGISTRATION` в `partner_events`

### 4.2 Клик по реф-ссылке

Новый эндпоинт `POST /api/partners/track-click`:
- Body: `{ refCode, ip, userAgent, referer }`
- Найти партнёра по refCode
- Записать в `partner_clicks`
- Response: `{ ok: true }`

Вызывается с основного фронта при загрузке страницы если есть `?ref=` в URL.

### 4.3 Начисление RevShare при закрытии сделки

В `trade-closing.service.ts` после закрытия сделки с результатом LOSS:
```typescript
// Проверить есть ли у пользователя партнёр
const user = await userRepository.findById(trade.userId);
if (user.partnerId) {
  const partner = await partnerRepository.findById(user.partnerId);
  if (partner && partner.status === 'ACTIVE') {
    const earning = trade.amount * (partner.revsharePercent / 100);
    // В одной транзакции:
    // 1. Создать partner_earnings запись
    // 2. Обновить partner.balance += earning
    // 3. Обновить partner.totalEarned += earning
  }
}
```

### 4.4 Запись FTD

В `wallet.controller.ts` webhook при confirmed DEPOSIT:
- Проверить `user.partnerId`
- Проверить что у пользователя ещё нет события FTD в `partner_events`
- Если нет → записать FTD событие

---

## 5. БЭКЕНД — НОВЫЕ ЭНДПОИНТЫ `/api/partners/*`

### 5.1 Авторизация партнёра

**POST /api/partners/register**
- Body: `{ email, password, firstName?, lastName?, telegramHandle? }`
- Создать Partner с уникальным refCode
- Установить bcrypt пароль
- Вернуть партнёра и JWT/session токен
- Rate limit: 5/час

**POST /api/partners/login**
- Body: `{ email, password }`
- Проверить пароль bcrypt
- Создать сессию (отдельная таблица `partner_sessions` или тот же `sessions` с флагом)
- Установить cookie `partner_session`
- Response: `{ partner: PartnerPublicDTO }`

**POST /api/partners/logout**
- Удалить сессию
- Очистить cookie

**GET /api/partners/me**
- Auth: requirePartnerAuth
- Response: `{ partner: PartnerPublicDTO }`

### 5.2 Дашборд

**GET /api/partners/dashboard**
- Auth: requirePartnerAuth
- Response:
```typescript
{
  refCode: string
  refUrl: string          // полная ссылка comfortrade.com?ref=CODE
  stats: {
    clicksTotal: number        // всего кликов за всё время
    clicksToday: number        // кликов сегодня
    clicksThisMonth: number    // кликов за месяц
    registrationsTotal: number // всего зарегистрировалось
    registrationsToday: number
    registrationsThisMonth: number
    ftdTotal: number           // всего первых депозитов
    ftdToday: number
    ftdThisMonth: number
    conversionRate: number     // FTD / Registrations * 100
    earningsTotal: number      // всего заработано
    earningsToday: number
    earningsThisMonth: number
    balance: number            // доступно для вывода
    activeReferrals: number    // рефералы которые торговали последние 30 дней
  }
  // Статистика по дням за последние 30 дней
  chartData: Array<{
    date: string        // YYYY-MM-DD
    clicks: number
    registrations: number
    ftd: number
    earnings: number
  }>
}
```

### 5.3 Рефералы

**GET /api/partners/referrals**
- Auth: requirePartnerAuth
- Query: `page?, limit?` (default 50)
- Response:
```typescript
{
  referrals: Array<{
    id: string
    registeredAt: string
    ftdAt: string | null        // дата первого депозита
    ftdAmount: number | null    // сумма первого депозита
    totalDeposits: number       // всего депозитов
    totalTrades: number         // всего сделок
    earned: number              // сколько принёс партнёру
    lastActiveAt: string | null // последняя сделка
  }>
  total: number
  page: number
  totalPages: number
}
```

Важно: НЕ показывать email/имя реферала — только анонимный ID и статистика.

### 5.4 Заработок

**GET /api/partners/earnings**
- Auth: requirePartnerAuth
- Query: `page?, limit?`
- Response:
```typescript
{
  earnings: Array<{
    id: string
    amount: number
    referralId: string    // анонимный ID реферала
    createdAt: string
  }>
  total: number
  totalAmount: number
}
```

### 5.5 Выводы

**GET /api/partners/withdrawals**
- Auth: requirePartnerAuth
- Response: `{ withdrawals: PartnerWithdrawalDTO[], balance: number }`

**POST /api/partners/withdrawals**
- Auth: requirePartnerAuth
- Body: `{ amount: number, paymentMethod: string }`
- Проверки:
  - amount >= 500 (минимум)
  - amount <= partner.balance
  - Нет активных PENDING выводов
- Создать запись `PENDING`
- Уменьшить `partner.balance` на amount (заморозить)
- Response: `{ withdrawal: PartnerWithdrawalDTO }`

---

## 6. БЭКЕНД — ЭНДПОИНТЫ ДЛЯ АДМИНКИ `/api/admin/partners/*`

**GET /api/admin/partners**
- requireAdmin
- Query: `search?, status?, page?`
- Response: список партнёров с балансами и статистикой

**GET /api/admin/partners/:id**
- requireAdmin
- Response: детальная информация партнёра

**PATCH /api/admin/partners/:id/status**
- requireAdmin
- Body: `{ status: 'ACTIVE' | 'SUSPENDED' }`

**GET /api/admin/partners/withdrawals**
- requireAdmin
- Query: `status?`
- Список всех запросов на вывод

**PATCH /api/admin/partners/withdrawals/:id/pay**
- requireAdmin
- Body: `{ note?: string }`
- Установить статус PAID, записать paidAt

**PATCH /api/admin/partners/withdrawals/:id/reject**
- requireAdmin
- Body: `{ note: string }`
- Установить статус REJECTED
- Вернуть amount на баланс партнёра

---

## 7. АВТОРИЗАЦИЯ ПАРТНЁРОВ

Партнёры авторизуются отдельно от обычных пользователей.

### 7.1 Таблица `partner_sessions`
```
id          String    PK (cuid)
partnerId   String    FK → partners.id
tokenHash   String    UNIQUE
expiresAt   DateTime
userAgent   String?
ipAddress   String?
createdAt   DateTime  DEFAULT now()
```

### 7.2 Middleware `requirePartnerAuth`
```typescript
// backend/src/middleware/partner-auth.middleware.ts
// Читает cookie partner_session
// Проверяет tokenHash в partner_sessions
// Проверяет expiresAt
// Устанавливает request.partnerId
```

---

## 8. ФРОНТЕНД ПАРТНЁРКИ

### 8.1 Страницы

**Login (`/login`)**
- Форма: email + password
- POST /api/partners/login
- После успеха → /dashboard

**Register (`/register`)**
- Форма: email, password, имя (опционально), telegram (опционально)
- POST /api/partners/register
- После успеха → /dashboard

**Dashboard (`/dashboard`)**
Главная страница партнёра.

Верхний блок — реферальная ссылка:
```
Ваша реферальная ссылка:
[comfortrade.com?ref=ABCD1234] [Копировать]
```

Карточки статистики (2 ряда по 4):
```
[Клики сегодня] [Регистрации сегодня] [FTD сегодня] [Заработок сегодня]
[Клики всего]   [Регистрации всего]   [FTD всего]   [Баланс к выводу]
```

График за последние 30 дней (простой линейный, через Canvas или recharts):
- Переключатель: Клики / Регистрации / FTD / Заработок

**Referrals (`/referrals`)**
Таблица рефералов:
ID (анонимный) | Дата регистрации | Первый депозит | Всего сделок | Принёс дохода | Последняя активность

**Withdrawals (`/withdrawals`)**
Верхний блок:
```
Доступно к выводу: 1,250.00 UAH
[Запросить вывод]
```

Форма запроса вывода:
- Сумма (min 500)
- Реквизиты (textarea — карта/крипто/etc)
- Кнопка Запросить

История выводов:
Дата | Сумма | Реквизиты | Статус (PENDING/PAID/REJECTED) | Комментарий

### 8.2 Layout

Навигация:
```
📊 Dashboard
👥 Рефералы
💰 Выводы
```

Топбар: email партнёра + кнопка выйти.

---

## 9. ОСНОВНОЙ САЙТ — ИЗМЕНЕНИЯ

### 9.1 Трекинг клика

В `frontend/app/[locale]/page.tsx` (лендинг) и в `frontend/middleware.ts`:
- При загрузке: проверить `?ref=` в URL
- Если есть → сохранить в cookie `ref_code` (TTL 30 дней)
- Отправить `POST /api/partners/track-click` (fire and forget)

### 9.2 Передача refCode при регистрации

В `frontend/components/auth/RegisterForm` (или где регистрация):
- При отправке формы: читать cookie `ref_code`
- Если есть → передать `refCode` в body `POST /api/auth/register`

---

## 10. DTO ТИПЫ

```typescript
// PartnerPublicDTO
interface PartnerPublicDTO {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  telegramHandle: string | null
  refCode: string
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
  revsharePercent: number
  balance: string
  totalEarned: string
  createdAt: string
}

// PartnerWithdrawalDTO
interface PartnerWithdrawalDTO {
  id: string
  amount: string
  status: 'PENDING' | 'PAID' | 'REJECTED'
  paymentMethod: string | null
  note: string | null
  createdAt: string
  paidAt: string | null
}

// PartnerReferralDTO
interface PartnerReferralDTO {
  id: string                  // анонимный внутренний ID
  registeredAt: string
  ftdAt: string | null
  ftdAmount: string | null
  totalDeposits: string
  totalTrades: number
  earned: string
  lastActiveAt: string | null
}

// PartnerEarningDTO
interface PartnerEarningDTO {
  id: string
  amount: string
  referralId: string
  createdAt: string
}
```

---

## 11. ПОРЯДОК РЕАЛИЗАЦИИ

### Шаг 1 — Prisma schema
1. Добавить таблицы: `partners`, `partner_clicks`, `partner_events`, `partner_earnings`, `partner_withdrawals`, `partner_sessions`
2. Добавить `partnerId` в таблицу `users`
3. `npm run db:migrate`

### Шаг 2 — Бэкенд: партнёрская авторизация
1. `partner-auth.middleware.ts`
2. `partner.repository.ts`
3. `partner-session.repository.ts`
4. `POST /api/partners/register`
5. `POST /api/partners/login`
6. `POST /api/partners/logout`
7. `GET /api/partners/me`

### Шаг 3 — Бэкенд: трекинг
1. `POST /api/partners/track-click`
2. Изменить `POST /api/auth/register` — принять и обработать refCode
3. Изменить webhook депозита — записать FTD

### Шаг 4 — Бэкенд: RevShare начисление
1. Изменить `trade-closing.service.ts` — начислять RevShare при LOSS
2. `partner-earnings.repository.ts`

### Шаг 5 — Бэкенд: кабинет партнёра
1. `GET /api/partners/dashboard`
2. `GET /api/partners/referrals`
3. `GET /api/partners/earnings`
4. `GET /api/partners/withdrawals`
5. `POST /api/partners/withdrawals`

### Шаг 6 — Бэкенд: admin эндпоинты
1. Добавить в `admin.routes.ts` эндпоинты для управления партнёрами

### Шаг 7 — Основной фронт
1. Трекинг `?ref=` в middleware
2. Передача refCode при регистрации

### Шаг 8 — Фронт партнёрки
1. Базовая структура `partners/`
2. Auth (login/register)
3. Layout
4. Dashboard
5. Referrals
6. Withdrawals

---

## 12. ПРАВИЛА КОДА

- TypeScript strict, никаких any
- RevShare начисляется ТОЛЬКО при результате LOSS (не TIE, не WIN)
- Email реферала НИКОГДА не передаётся партнёру — только анонимный ID
- Все финансовые операции партнёра — через транзакции с ledger-подобными записями
- При заморозке баланса на вывод — атомарная операция

---

## 13. ENV ПЕРЕМЕННЫЕ

```env
# backend/.env (добавить)
PARTNERS_SITE_URL=https://partners.comfortrade.com

# partners/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

*Конец мастер-документа партнёрки. Версия 1.0*