# COMFORTRADE ADMIN — Мастер-документ
## Отдельное Next.js приложение

---

## 0. ВАЖНО: КАК ЧИТАТЬ ЭТОТ ДОКУМЕНТ

Это конституция админ-панели. Перед написанием любого кода читать полностью.

Принципы:
- Админка — отдельное Next.js приложение в папке `admin/`
- Деплоится на отдельный домен (`admin.comfortrade.com`)
- Использует тот же бэкенд (`backend/`) через отдельные `/api/admin/*` эндпоинты
- Доступ только для пользователей с `role === 'ADMIN'`
- Никакой публичной информации — всё за авторизацией

---

## 1. АРХИТЕКТУРА

```
admin/                          ← отдельное Next.js приложение
├── app/
│   ├── layout.tsx              ← корневой layout с AdminAuthProvider
│   ├── login/page.tsx          ← страница входа для админа
│   ├── page.tsx                ← redirect → /dashboard
│   ├── dashboard/page.tsx      ← дашборд
│   ├── users/
│   │   ├── page.tsx            ← список пользователей + поиск
│   │   └── [id]/page.tsx       ← детальная страница юзера
│   ├── trades/page.tsx         ← все сделки с фильтрами
│   ├── instruments/page.tsx    ← управление инструментами
│   └── sessions/page.tsx       ← активные WS сессии
├── components/
│   ├── AdminAuthProvider.tsx
│   ├── AdminGuard.tsx
│   ├── layout/
│   │   ├── AdminSidebar.tsx
│   │   └── AdminTopBar.tsx
│   └── ui/
│       ├── DataTable.tsx
│       ├── Badge.tsx
│       ├── SearchInput.tsx
│       └── ConfirmModal.tsx
├── lib/
│   ├── api/admin-api.ts        ← fetch wrapper для admin API
│   └── hooks/
│       └── useAdminAuth.ts
└── types/
    └── admin.ts                ← все типы для админки
```

---

## 2. ТЕХНИЧЕСКИЙ СТЕК

- **Framework:** Next.js 14+ App Router
- **Язык:** TypeScript strict
- **Стили:** Tailwind CSS (тёмная тема, минималистичный UI)
- **Стейт:** React hooks (никакого Zustand — всё просто)
- **HTTP:** fetch wrapper с credentials: include и CSRF
- **Авторизация:** те же cookie сессии что и основной сайт

---

## 3. АВТОРИЗАЦИЯ АДМИНКИ

### 3.1 Как работает

Админ входит через тот же `POST /api/auth/login` что и обычный пользователь.
После входа сервер устанавливает cookie сессии.
При каждом запросе к `/api/admin/*` бэкенд проверяет `requireAdmin` middleware.
Если `user.role !== 'ADMIN'` — 403 Forbidden.

### 3.2 AdminAuthProvider

```typescript
// Проверяет при монтировании: GET /api/auth/me
// Если user.role !== 'ADMIN' → redirect на /login
// Контекст: { admin, isLoading }
```

### 3.3 AdminGuard

Оборачивает все страницы кроме /login.
Пока isLoading — показывает spinner.
Если не админ — redirect на /login.

---

## 4. БЭКЕНД — НОВЫЕ ЭНДПОИНТЫ `/api/admin/*`

Все эндпоинты защищены `requireAdmin` middleware.
Файл: `backend/src/modules/admin/admin.routes.ts` (сейчас пустой — заполняем).

### 4.1 Dashboard

**GET /api/admin/dashboard**
Response:
```typescript
{
  stats: {
    usersTotal: number           // всего пользователей
    usersToday: number           // зарегистрировались сегодня
    activeNow: number            // онлайн прямо сейчас (WS соединения)
    tradesOpenNow: number        // открытых сделок прямо сейчас
    tradesToday: number          // сделок за сегодня
    volumeToday: number          // объём торгов за сегодня (сумма amount)
    depositsToday: number        // сумма подтверждённых депозитов за сегодня
    withdrawalsToday: number     // сумма подтверждённых выводов за сегодня
    pendingWithdrawals: number   // количество pending выводов
  }
}
```

### 4.2 Users

**GET /api/admin/users**
Query: `search?: string` (поиск по id, email, nickname), `page?: number`, `limit?: number` (default 50)
Response:
```typescript
{
  users: AdminUserDTO[]
  total: number
  page: number
  totalPages: number
}
```

**GET /api/admin/users/:id**
Response:
```typescript
{
  user: AdminUserDetailDTO    // полные данные юзера
  accounts: AdminAccountDTO[] // все счета с балансами
  stats: {
    totalTrades: number
    winRate: number
    totalVolume: number
    totalDeposits: number
    totalWithdrawals: number
  }
  recentTrades: AdminTradeDTO[]       // последние 20 сделок
  recentTransactions: AdminTransactionDTO[] // последние 20 транзакций
  activeSessions: AdminSessionDTO[]   // активные сессии
}
```

**PATCH /api/admin/users/:id/ban**
Body: `{ reason: string }`
Действия:
- Установить `user.isActive = false`
- Удалить все активные сессии юзера
- Закрыть все WS соединения юзера
- Записать в лог действие администратора
Response: `{ success: true }`

**PATCH /api/admin/users/:id/unban**
Действия:
- Установить `user.isActive = true`
Response: `{ success: true }`

**PATCH /api/admin/users/:id/balance**
Body: `{ accountId: string, amount: number, direction: 'CREDIT' | 'DEBIT', reason: string }`
Проверки:
- amount > 0
- reason непустой
- accountId принадлежит userId
Действия (в одной транзакции):
- Обновить баланс аккаунта
- Создать ledger entry типа `BONUS` (CREDIT) или `REFUND` (DEBIT)
- Отправить WS account.snapshot юзеру
Response: `{ success: true, newBalance: string }`

**PATCH /api/admin/users/:id/kyc**
Body: `{ status: 'VERIFIED' | 'REJECTED' | 'PENDING' }`
Действия:
- Обновить `user.kycStatus`
Response: `{ success: true }`

**DELETE /api/admin/users/:id/sessions**
Действия:
- Удалить все сессии юзера из БД
- Закрыть все WS соединения юзера
Response: `{ success: true }`

**PATCH /api/admin/users/:id/reset-2fa**
Действия:
- Установить `twoFactorEnabled = false`, `twoFactorSecret = null`, `twoFactorBackupCodes = []`
Response: `{ success: true }`

### 4.3 Trades

**GET /api/admin/trades**
Query: `userId?: string`, `status?: 'OPEN'|'WIN'|'LOSS'|'TIE'`, `instrument?: string`, `page?: number`, `limit?: number`
Response:
```typescript
{
  trades: AdminTradeDTO[]
  total: number
  page: number
  totalPages: number
}
```

**GET /api/admin/trades/active**
Response: `{ trades: AdminTradeDTO[] }` — все открытые сделки прямо сейчас

### 4.4 Instruments

**GET /api/admin/instruments**
Response: `{ instruments: AdminInstrumentDTO[] }` — все инструменты включая неактивные

(Изменение payout и toggle уже есть через существующие эндпоинты:
`PATCH /api/instruments/:id/payout` и `PATCH /api/instruments/:id/toggle`)

### 4.5 Sessions (мониторинг)

**GET /api/admin/sessions**
Response:
```typescript
{
  activeConnections: number
  connections: Array<{
    userId: string
    email: string
    connectedAt: number
    subscriptions: string[]  // на какие инструменты подписан
  }>
}
```

---

## 5. DTO ТИПЫ (бэкенд)

```typescript
// AdminUserDTO — для списка
interface AdminUserDTO {
  id: string
  email: string
  nickname: string | null
  firstName: string | null
  lastName: string | null
  role: 'USER' | 'ADMIN'
  isActive: boolean
  kycStatus: string | null
  twoFactorEnabled: boolean
  createdAt: string
  realBalance: string    // баланс реального счёта
  demoBalance: string    // баланс демо счёта
}

// AdminUserDetailDTO — для страницы юзера
interface AdminUserDetailDTO extends AdminUserDTO {
  phone: string | null
  country: string | null
  dateOfBirth: string | null
  avatarUrl: string | null
  currency: string
  googleId: string | null  // есть ли Google OAuth
  kycApplicantId: string | null
  lastLoginAt: string | null  // из последней сессии
  ipAddress: string | null    // из последней сессии
}

// AdminAccountDTO
interface AdminAccountDTO {
  id: string
  type: 'DEMO' | 'REAL'
  balance: string
  currency: string
  isActive: boolean
}

// AdminTradeDTO
interface AdminTradeDTO {
  id: string
  userId: string
  userEmail: string
  instrument: string
  direction: 'CALL' | 'PUT'
  amount: string
  entryPrice: string
  exitPrice: string | null
  payoutPercent: number
  payoutAmount: string | null
  status: 'OPEN' | 'WIN' | 'LOSS' | 'TIE'
  openedAt: string
  expiresAt: string
  closedAt: string | null
}

// AdminTransactionDTO
interface AdminTransactionDTO {
  id: string
  userId: string
  userEmail: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  amount: string
  currency: string
  paymentMethod: string
  cardLastFour: string | null
  externalId: string | null
  createdAt: string
  confirmedAt: string | null
}

// AdminSessionDTO
interface AdminSessionDTO {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
}

// AdminInstrumentDTO
interface AdminInstrumentDTO {
  id: string
  name: string
  base: string
  quote: string
  type: 'REAL' | 'OTC'
  isActive: boolean
  payoutPercent: number
  sortOrder: number
}
```

---

## 6. СТРАНИЦЫ АДМИНКИ (ФРОНТЕНД)

### 6.1 Layout

Все страницы кроме /login оборачиваются в AdminLayout:
- Левый сайдбар (240px): навигация
- Верхняя панель: имя админа, кнопка выхода
- Основная область: контент страницы

Навигация в сайдбаре:
```
📊 Dashboard
👥 Пользователи
📈 Сделки
🎰 Инструменты
🔌 Сессии
```

### 6.2 Dashboard (`/dashboard`)

Верхний ряд — карточки со статистикой:
```
[Всего юзеров] [Онлайн сейчас] [Открытых сделок] [Pending выводов]
[Депозиты сегодня] [Выводы сегодня] [Объём торгов сегодня] [Новых сегодня]
```

Каждая карточка: число + название + иконка.
Автообновление каждые 30 секунд.

### 6.3 Пользователи (`/users`)

**Список:**
- Поиск по ID / email / nickname (debounce 300ms)
- Таблица: ID | Email | Никнейм | Реальный баланс | KYC | Статус | Дата рег | Действия
- Пагинация (50 на страницу)
- Клик на строку → страница юзера
- Бейдж статуса: зелёный (активен), красный (забанен)

**Детальная страница юзера (`/users/[id]`):**

Верхняя секция — карточка юзера:
```
Аватар | Email | ID | Никнейм | Дата регистрации | IP последнего входа
[Забанить/Разбанить] [Сбросить 2FA] [Убить все сессии]
```

Табы на странице:
1. **Обзор** — балансы счетов, KYC статус с кнопкой изменить, основные показатели
2. **Сделки** — таблица последних сделок с пагинацией
3. **Транзакции** — таблица депозитов/выводов
4. **Сессии** — список активных сессий с IP и датой

Блок "Изменить баланс":
- Выбор счёта (DEMO / REAL)
- Сумма
- Направление (Пополнить / Списать)
- Причина (текстовое поле, обязательное)
- Кнопка применить с подтверждением

### 6.4 Сделки (`/trades`)

Фильтры:
- По статусу: Все / OPEN / WIN / LOSS / TIE
- По инструменту: dropdown
- Поиск по userId

Таблица:
ID | Юзер (email) | Инструмент | Направление | Сумма | Статус | Открыта | Закрыта | Payout

Внизу таблицы: "Открытых сделок сейчас: N" с автообновлением.

### 6.5 Инструменты (`/instruments`)

Таблица всех инструментов:
Название | Тип (OTC/REAL) | Статус | Доходность % | Действия

Действия в строке:
- Тоггл вкл/выкл (switch)
- Изменить доходность (inline input, 60-90, с кнопкой сохранить)

Изменение доходности:
- Клик на число → появляется input
- Ввод нового значения
- Кнопка ✓ сохранить / ✗ отменить
- Подтверждение перед сохранением

### 6.6 Сессии (`/sessions`)

Показывает активные WebSocket соединения:
- Количество онлайн сейчас
- Таблица: Юзер (email) | Время подключения | Инструмент | IP
- Автообновление каждые 10 секунд

---

## 7. БЕЗОПАСНОСТЬ АДМИНКИ

### 7.1 Защита роута на бэкенде
- Все `/api/admin/*` → `requireAdmin` middleware
- `requireAdmin` проверяет `user.role === 'ADMIN'` в БД
- При 403 → редирект на /login в AdminGuard

### 7.2 Логирование действий
Каждое изменяющее действие администратора логируется:
```typescript
// В каждом admin endpoint который что-то меняет:
logger.info({
  adminId: request.userId,
  action: 'BAN_USER' | 'CHANGE_BALANCE' | 'RESET_2FA' | ...,
  targetUserId: params.id,
  details: { ... }
}, 'Admin action')
```

### 7.3 Подтверждение опасных действий
На фронтенде перед выполнением: бан, изменение баланса, сброс 2FA — показывать ConfirmModal с текстом действия.

### 7.4 Отдельный домен
Деплоить на `admin.comfortrade.com`.
В nginx добавить IP whitelist.

---

## 8. ПРАВИЛА КОДА

- TypeScript strict, никаких any
- Все API вызовы через `adminApi` wrapper (не голый fetch)
- Ошибки обрабатываются и показываются пользователю (toast)
- Загрузка показывается (skeleton или spinner)
- Пустые состояния обрабатываются ("Пользователи не найдены")
- Все числа валютные отображаются с 2 знаками после запятой
- Даты в формате DD.MM.YYYY HH:mm

---

## 9. ПОРЯДОК РЕАЛИЗАЦИИ

### Шаг 1 — Бэкенд эндпоинты
1. `admin.routes.ts` — зарегистрировать все роуты
2. `admin.controller.ts` — все обработчики
3. `admin.service.ts` — бизнес-логика (поиск, фильтрация, изменения)

### Шаг 2 — Next.js приложение
1. Создать папку `admin/` с базовой структурой
2. `package.json`, `tsconfig.json`, `tailwind.config.js`
3. `AdminAuthProvider` + `AdminGuard`
4. Layout (сайдбар + топбар)
5. `adminApi` wrapper

### Шаг 3 — Страницы по порядку
1. Login
2. Dashboard
3. Users (список + детальная)
4. Trades
5. Instruments
6. Sessions

### Шаг 4 — Финальная проверка
- Все действия работают
- Ошибки обрабатываются
- `npm run build` — 0 ошибок

---

## 10. ENV ПЕРЕМЕННЫЕ АДМИНКИ

```env
# admin/.env.local
NEXT_PUBLIC_API_URL=https://api.comfortrade.com
```

---

## 11. СОЗДАНИЕ ПЕРВОГО АДМИНИСТРАТОРА

В `backend/prisma/seed.ts` добавить создание admin пользователя:
```typescript
// Только если ADMIN_EMAIL и ADMIN_PASSWORD заданы в env
// user.role = 'ADMIN'
```

Или через прямой SQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@comfortrade.com';
```

---

*Конец мастер-документа админки. Версия 1.0*
*Читать полностью перед началом реализации.*