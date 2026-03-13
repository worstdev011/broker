## Линейный график: архитектура и работа

Этот документ подробно описывает, как устроен и работает линейный график в фронтенде проекта.

- **Главный React‑компонент**: `frontend/components/chart/line/LineChart.tsx`
- **Главный хук оркестрации**: `frontend/components/chart/line/useLineChart.ts`
- **Рендер линии на Canvas**: `frontend/components/chart/line/renderLine.ts`
- **Вьюпорт (временное окно)**: `frontend/components/chart/line/useLineViewport.ts`
- **Интеграция с WebSocket**: `frontend/components/chart/line/useLineData.ts`

Ниже — детальное описание по слоям: от данных и времени до рендера и взаимодействий.

---

## 1. Общая концепция линейного графика

Линейный график реализован как **Canvas‑график поверх потока тиков**:

- Источник данных — **тик‑поток** (цена + timestamp) из WebSocket.
- Вся логика крутится вокруг **временного окна** (viewport): \[timeStart, timeEnd\].
- На экране:
  - рисуется **историческая линия** по редуцированным точкам (агрегация до 1 сек),
  - рисуется **«живой» сегмент** от последнего тика к «сейчас»,
  - в конце линии — **пульсирующая точка**,
  - поверх — **сетка, оси, индикаторы, сделки, рисовалка, кроссхейр и линия экспирации**.

График строится в одну непрерывную линию (pure lineTo), без «ступенек»: каждый тик превращается в точку и соединяется прямой.

---

## 2. Жизненный цикл данных: от WebSocket до Canvas

### 2.1. Поток данных (WebSocket) → `useLineData`

Фактическое получение тиков происходит через хук `useWebSocket` в компоненте `LineChart.tsx`, но логика работы с линейным графиком инкапсулирована в `useLineChart`, который в свою очередь использует:

- `useLineData` (`frontend/components/chart/line/useLineData.ts`):
  - принимает `price` и `timestamp`,
  - вызывает `viewport.calibrateTime(timestamp)` — **калибрует «стеночное» время графика по времени сервера**,
  - пушит тик в хранилище:
    - `pointStore.push({ time: timestamp, price })`,
  - создает **live‑segment**:
    - `fromTime` = время последнего тика,
    - `toTime` = `timestamp + 500` мс,
    - `fromPrice` = цена тика,
    - `startedAt` синхронизируется так, чтобы анимация не «скакала» между обновлениями.

`LiveSegment` — это **эфемерное состояние**, которое описывает короткий горизонтальный/анимируемый отрезок от последнего известного тика до «сейчас».

### 2.2. Хранилище точек (Point Store и Reduced Points)

Внутри `useLineChart`:

- `useLinePointStore()`:
  - хранит **сырые тики** (`PricePoint[]`),
  - предоставляет методы `push`, `prepend`, `appendMany`, `getAll`, `getLast`, `reset`.
- `useLineReducedPoints()`:
  - строит **редуцированную версию истории** — агрегация до 1‑секундных «бакетов»,
  - позволяет эффективно рисовать длинную историю без падения FPS,
  - используется в рендер‑цикле как основной источник точек для визуализации.

Поток выглядит так:

1. WebSocket → `handlePriceUpdate` (из `useLineChart`).
2. `useLineData.onPriceUpdate`:
   - калибрует время,
   - пишет тик в `pointStore`,
   - обновляет `liveSegment`.
3. Параллельно:
   - `reducedPoints.pushTick({ time, price })` наполняет редуцированный массив,
   - `priceAnimator.onPriceUpdate(price)` запускает анимацию цены.

---

## 3. Временное окно (viewport) и работа с временем

### 3.1. Viewport как временной отрезок (`useLineViewport`)

Хук `useLineViewport` управляет **время‑ориентированным окном**:

- `LineViewport = { timeStart, timeEnd, autoFollow }`
- Ширина окна по умолчанию: `DEFAULT_WINDOW_MS = 420 000` мс (`~7 минут`).
- Справа всегда есть **30% свободного места** (RIGHT_PADDING_RATIO = 0.30), чтобы:
  - линия не упиралась в правый край,
  - было куда «ехать» live‑сегменту.

Основные операции:

- `zoom(factor)` / `zoomAt(factor, anchorRatio)`:
  - меняет ширину временного окна, ограниченную:
    - `MIN_WINDOW_MS = DEFAULT_WINDOW_MS * 0.5` (максимальный zoom in),
    - `MAX_WINDOW_MS = DEFAULT_WINDOW_MS * 1.5` (максимальный zoom out),
  - зум привязан к **якорной точке** внутри окна: `anchorRatio` (0–1).
- `pan(deltaMs)`:
  - двигает окно по времени,
  - всегда отключает `autoFollow`,
  - ограничивает сдвиг по **границам данных** через `setDataBounds` + `clampToDataBounds`
    (пан нельзя увести далеко за историю).
- `resetFollow()`:
  - включает `autoFollow = true`,
  - сбрасывает внутренние счетчики «шагов по секундам».

### 3.2. Привязка к серверному времени (time anchor)

Чтобы график шел синхронно с сервером:

- В `useLineViewport` хранится `timeAnchorRef`:
  - `wallTime` — текущее представление «серверного времени»,
  - `perfTime` — `performance.now()` на момент синхронизации.
- `getWallTime(perfNow)`:
  - восстанавливает «стеночное» время из якоря: `wallTime + (perfNow - perfTime)`.
- `calibrateTime(serverTimestamp)`:
  - сравнивает текущую оценку времени с серверной меткой,
  - если ошибка больше 50 мс — **плавно подправляет якорь** (на 30% ошибки), чтобы не было резких скачков.

Итог: все расчёты live‑сегмента и continuous‑follow используют **единый источник времени**, согласованный с сервером.

### 3.3. «Пошаговая» прокрутка по секундам (continuous follow)

Функция `advanceContinuousFollow(perfNow)` реализует поведение «как на Pocket Option»:

- Пока `autoFollow = true`:
  - график **стоит на месте в течение секунды**,
  - каждую полную секунду (`wallNow` пересекает целое количество секунд) окно **сдвигается ровно на 1000 мс**,
  - между шагами весь «движ» происходит за счет **роста live‑сегмента**, а не за счёт ползущего окна.

Технически:

- `SCROLL_STEP_MS = 1000`.
- `lastSecondRef` отслеживает уже учтённую «целую секунду».
- При переходе к новой секунде `scrollTargetEndRef` увеличивается на `stepMs`.
- Внутри рендера:
  - `timeEnd` принудительно становится равным `scrollTargetEndRef`,
  - `timeStart = timeEnd - windowMs`.

Это даёт стабильную визуализацию секундной сетки без плавания пикселей.

---

## 4. Главный оркестратор: `useLineChart`

Хук `useLineChart` («сердце» линейного графика) собирает вместе:

- **Хранилища и вычисления**:
  - `pointStore` — сырые тики,
  - `reducedPoints` — редуцированные точки,
  - `viewport` — временное окно,
  - `lineData` — интеграция с WebSocket (`LiveSegment`),
  - `priceAnimator` — плавная анимация цены.
- **UI‑слои**:
  - `crosshair` — кроссхейр,
  - `drawings` + `useDrawingInteractions` + `useDrawingEdit` — рисовалка на графике,
  - `indicators` (`useLineIndicators`) — расчёт индикаторов по тикам,
  - `renderIndicators` — рендер нижних/верхних панелей индикаторов,
  - `renderTrades` — отрисовка позиций/сделок,
  - `renderHoverHighlight` — визуальный отклик на hover CALL/PUT,
  - `renderPriceLine`, `renderPriceAxis`, `renderTimeAxis`, `renderBackground`, `renderInstrumentWatermark`.

Из `useLineChart` наружу экспортируются методы, которые использует `LineChart.tsx`:

- управление панорамированием/зумом (`zoom`, `zoomAt`, `pan`, `resetFollow`, `setAutoFollow`),
- управление линией экспирации (`setExpirationSeconds`, `handleServerTime`),
- работа с overlay‑сделками (`addTradeOverlayFromDTO`, `removeTrade`, очистка истёкших),
- работа с drawings (`addDrawing`, `removeDrawing`, `getDrawings`, `clearDrawings`),
- и служебные методы (`getViewport`, `getPoints`, `setPanInertiaRefs`, `scheduleReturnToFollow` и т.д.).

---

## 5. Рендер‑цикл (requestAnimationFrame)

Основной рендер графика реализован внутри `useEffect` в `useLineChart`:

1. Получаем `canvas` и создаём 2D‑контекст.
2. Подстраиваем Canvas под размер элемента и `devicePixelRatio`:
   - наблюдаем за размером через `ResizeObserver`,
   - следим за изменением DPR через `matchMedia`,
   - физический размер `canvas.width / canvas.height` = `cssSize * dpr`.
3. Запускаем бесконечный цикл `render(now)` через `requestAnimationFrame`.

На каждом кадре:

1. **Обновляем время и auto‑follow**:
   - `advancePanInertiaRef.current(now)` — инерция pan,
   - `advanceReturnToFollowRef.current(now)` — анимация возврата в follow,
   - `viewport.advanceContinuousFollow(now)` — секундная прокрутка окна.
2. Забираем все данные:
   - `historyPoints` — сырые тики,
   - `historyReduced` — редуцированные точки,
   - `liveSegmentRef.current` — live‑сегмент,
   - `currentViewport = viewport.getViewport()`.
3. Обновляем **границы данных** (`setDataBounds`), чтобы ограничить pan:
   - `timeMin = firstPoint.time`, `timeMax = lastPoint.time`.
4. Если live‑сегмента нет, но есть история:
   - генерируется **синтетический live‑segment** от последней точки к «сейчас»,
   - это гарантирует, что линия всегда тянется до текущего времени.
5. Если данных нет совсем:
   - рендерим фон, watermark и текст «Ожидание данных…».
6. Если данные есть:
   - считаем **целевой ценовой диапазон**: `calculatePriceRange(historyReduced, currentViewport)`,
   - сглаживаем ценовой диапазон по времени (асимметричный EMA):
     - вверх (когда цена «убегает») — быстро (τ ≈ 60 мс),
     - вниз (когда цена возвращается) — умеренно (τ ≈ 200 мс),
     - если дельта стала меньше 0.05% от диапазона — **мгновенно притягиваем** (snap).
   - обновляем `viewport.updatePriceRange(min, max)`,
   - получаем `timePriceViewport` (совместный диапазон по времени и цене).

После подготовки данных запускается фактический рендер:

1. Фон и watermark: `renderBackground`, `renderInstrumentWatermark`.
2. Сетка: `renderGrid` с учётом `timePriceViewport` и высоты основной области.
3. Линия цены: `renderLine` (см. следующий раздел).
4. Пульсирующая точка на конце линии: `renderPulsatingPoint`.
5. Линия экспирации (флажок и вертикальная линия).
6. Hover‑подсветка CALL/PUT: `renderHoverHighlight`.
7. Сделки: `renderTrades`:
   - предварительно чистятся истёкшие сделки, если события `trade:close` не пришли (`TRADE_EXPIRY_GRACE_MS = 10_000` мс).
8. Рисовалка (drawings): `renderDrawings`.
9. Индикаторы: `renderIndicators` (подграфики RSI, Stochastic, MACD, и т.п.).
10. Линия текущей цены: `renderPriceLine`.
11. Оси:
    - `renderPriceAxis` — правая ось цен,
    - `renderTimeAxis` — нижняя ось времени.
12. Кроссхейр: `renderCrosshair` + `renderCrosshairTimeLabel`.

Все данные для рендера берутся из `renderParamsRef.current`, чтобы **не перезапускать эффект и RAF‑цикл при каждом ререндере React**.

---

## 6. Рендер линий: `renderLine.ts`

Файл `renderLine.ts` отвечает за чистую отрисовку линии и заливки **внутри Canvas‑контекста**. Здесь нет React — только математика и Canvas API.

### 6.1. Преобразование цены в Y‑координату

- `priceToY(price, priceMin, priceMax, height)`:
  - вычисляет нормализованное положение цены в диапазоне,
  - мапит его в пиксели от нижней границы графика:
    - чем выше цена, тем меньше Y (Canvas‑система координат начинается сверху).

### 6.2. Поиск видимых точек по времени

Чтобы не проходиться по всем тикам при каждом кадре, используются бинарные поиски:

- `lowerBound(ticks, target)` — индекс первого тика с `time >= target`.
- `upperBound(ticks, target)` — индекс первого тика с `time > target`.

Это даёт:

- **O(log N)** для поиска границ + **O(K)** для прохода по видимым точкам (K — число тиков в окне).

### 6.3. Построение пути линии: `traceLinearPath`

Функция `traceLinearPath`:

- принимает:
  - `ticks` (PricePoint[]),
  - диапазон индексов `[startIdx, endIdx)`,
  - `timeStart`, `invTimeRange`, `width`, `height`,
  - `priceMin`, `priceMax`,
  - опциональный `livePoint` (последняя живая точка),
- внутри:
  - проходит по всем тикам в окне,
  - для каждого тика:
    - вычисляет `x` как линейную интерполяцию по времени,
    - вычисляет `y` через `priceToY`,
    - первый тик задаёт `ctx.moveTo(x, y)`,
    - все последующие — `ctx.lineTo(x, y)`,
  - запоминает:
    - `firstX`, `firstY` — координаты первой точки,
    - `lastX`, `lastY` — координаты последней,
    - `minY` — минимальный Y (для расчёта верхней границы градиента).

Дополнительно:

- если передан `livePoint`:
  - рисуется **горизонтальный отрезок** от последнего исторического `lastY` до `x` live‑точки,
  - затем (при существенной разнице цен) — **вертикальный шаг** до `ly` (цены live‑точки),
  - это создаёт характерный вид live‑хвоста: горизонтальный «мостик» + вертикальный рывок при изменении цены.

### 6.4. Заливка под линией: `renderAreaFillPath`

Если включена заливка (`renderAreaFill: true`), используется:

- `renderAreaFillPath`:
  - вызывает `traceLinearPath`, чтобы выстроить основную линию и получить `firstX`, `lastX`, `minY`,
  - далее замыкает путь:
    - `ctx.lineTo(lastX, height)` — вниз к низу графика,
    - `ctx.lineTo(firstX, height)` — по низу до начала,
    - `ctx.closePath()`,
  - создаёт вертикальный градиент от `topY = clamp(minY, 0..height)` до низа:
    - сверху — полупрозрачный синий (`rgba(59,130,246,0.35)`),
    - снизу — почти прозрачный (`rgba(59,130,246,0.02)`),
  - `ctx.fill()` прокрашивает всю область под линией.

### 6.5. Основная функция рендера линии: `renderLine`

`renderLine(params: RenderLineParams)`:

1. Если нет тиков и нет live‑точки — ничего не рисует.
2. По `viewport.timeStart/timeEnd` вычисляет:
   - `timeRange`,
   - `startIdx` и `endIdx` через `lowerBound/upperBound`,
   - если видимых точек нет и live‑точки нет — выход.
3. Включает `ctx.save()` для локальных настроек.
4. При `renderAreaFill = true` вызывает `renderAreaFillPath`.
5. Настраивает стиль линии:
   - `strokeStyle = color` (по умолчанию `#4da3ff`),
   - `lineWidth = 1.5`,
   - скруглённые стыки и концы (`lineJoin = 'round'`, `lineCap = 'round'`).
6. Вызывает `traceLinearPath`, затем `ctx.stroke()`.
7. В конце `ctx.restore()` возвращает контекст в исходное состояние.

### 6.6. Расчёт ценового диапазона: `calculatePriceRange`

Для адаптивной шкалы цен:

- Выбираются только те тики, которые попадают во временной диапазон viewport.
- Вычисляются `min` и `max` по ценам.
- Если есть `liveSegment`:
  - в расчет добавляются `fromPrice` и (опционально) `toPrice`,
  - это гарантирует включение текущей цены и анимированной точки.
- Итоговый диапазон расширяется на 10% по обеим сторонам:
  - `padding = (max - min) * 0.1 || 1`,
  - итог: `min - padding`, `max + padding`.

---

## 7. Компонент `LineChart.tsx`: интеграция с UI и событиями

Компонент `LineChart`:

- объявлен с `forwardRef`, наружу отдаёт `LineChartRef`:
  - методы управления графиком (reset, zoom, pan, resetFollow),
  - управление линией экспирации (`setExpirationSeconds`),
  - добавление/удаление overlays для сделок и рисовалки.
- внутри:
  - создаёт `canvasRef`,
  - создаёт refs для pan‑инерции (`panVelocityPxPerMsRef`, `panInertiaActiveRef`) и передаёт их в `useLineChart.setPanInertiaRefs`.

### 7.1. Интеграция с WebSocket

Через хук `useWebSocket`:

- `onPriceUpdate` → `lineChart.handlePriceUpdate`,
- `onServerTime` → `lineChart.handleServerTime`,
- события сделок (`onTradeOpen`, `onTradeClose`) интегрированы с тостами и overlay‑слоями.

### 7.2. Загрузка snapshot и дозагрузка истории

При монтировании и смене инструмента:

- один раз загружается snapshot из `/api/line/snapshot?symbol=...`,
- `initializeFromSnapshot`:
  - заполняет `pointStore` и `reducedPoints`,
  - выставляет вьюпорт относительно `serverTime` с правым отступом,
  - создаёт `liveSegment` от последней точки до `serverTime`,
  - настраивает `priceAnimator`.

Дозагрузка истории при скролле назад:

- раз в 500 мс проверяется, насколько `timeStart` близок к самому старому point’у,
- если окно подвинуто достаточно далеко влево — запрашиваются старые точки `/api/line/history?...`,
- `prependHistory` добавляет старые данные в начало (`pointStore` и `reducedPoints`).

### 7.3. Взаимодействие мышью и тачем

Компонент напрямую подписывается на **нативные события** Canvas:

- `wheel`:
  - zoom in/out с якорем под курсором,
  - обнуляет инерцию pan,
  - отключает `autoFollow`, запускает логику возврата к follow в `useLineChart`.
- `mousedown/mousemove/mouseup`:
  - реализуют pan мышью,
  - скорость движения мыши собирается и усредняется (EMA) в `panInertiaRefs.velocityRef`,
  - при отпускании мыши:
    - если скорость выше порога — активируется инерция pan,
    - если ниже — сразу планируется возврат к follow.
- touch‑события:
  - один палец → pan,
  - два пальца → pinch‑zoom с якорем в центре жеста,
  - специальная логика, чтобы не мешать редактированию drawings.

Вся тяжёлая математика pan/zoom/return‑to‑follow реализована в `useLineChart` и `useLineViewport`, а компонент только собирает события и передаёт параметры.

---

## 8. Поведение follow‑mode, pan‑инерции и возврата к live

Состояние следования за ценой:

- **Auto‑follow включён**:
  - окно двигается «ступенчато» по секундам,
  - пользователь видит «живой» хвост справа.
- **Пользователь делает pan или zoom**:
  - `autoFollow` отключается,
  - viewport можно свободно двигать и масштабировать в заданных пределах.

### 8.1. Pan‑инерция

В `LineChart.tsx`:

- при движении мыши/тача скорость (px/ms) собирается и сглаживается (EMA),
- в момент `mouseup/touchend`, если модуль скорости > порога:
  - `panInertiaRefs.activeRef.current = true`,
  - `panInertiaRefs.velocityRef.current = emaVelocityRef.current`,
  - включается **инерционный pan** в рендер‑цикле (`advancePanInertia` в `useLineChart`).

В `useLineChart.advancePanInertia`:

- при каждом кадре:
  - считаем прошедшее время `dt`,
  - переводим скорость в смещение по времени через:
    - `pixelsPerMs = canvas.clientWidth / timeRange`,
    - `deltaMs = -deltaX / pixelsPerMs`,
  - применяем `viewport.pan(deltaMs)`,
  - уменьшаем скорость по экспоненте (`PAN_FRICTION_PER_16MS`).
- когда скорость падает ниже `PAN_STOP_EPSILON`:
  - инерция выключается,
  - планируется возврат к follow (`scheduleReturnToFollow`).

### 8.2. Возврат к follow‑mode

`scheduleReturnToFollow`:

- после паузы `RETURN_TO_FOLLOW_DELAY_MS = 3000` мс:
  - вычисляет, насколько сильно текущий viewport «отстаёт» от live‑положения (с учётом правого отступа),
  - если отставание < 500 мс — сразу включает `viewport.resetFollow()`,
  - иначе запускает **анимацию плавного возврата** (easeOutCubic, 400 мс).

`advanceReturnToFollow`:

- при каждом кадре:
  - если инерция ещё активна — ничего не делает (чтобы не было борьбы анимаций),
  - интерполирует смещение окна обратно к live‑положению,
  - когда анимация завершена — делает `viewport.resetFollow()`.

Таким образом, UX выглядит так:

- пользователь двигает/масштабирует график,
- при отпускании — график либо **плывёт по инерции**, либо, если инерции мало, просто **стоит**,
- через 3 секунды **мягко возвращается** к живой цене.

---

## 9. Линия экспирации

Внутри рендера в `useLineChart`:

- хранится:
  - текущее `serverTimeRef` (серверное время + локальный offset),
  - `expirationSecondsRef` — длительность до экспирации в секундах (управляется UI терминала),
  - анимационные рефы `expirationRenderTimeRef`, `expirationTargetTimeRef` и т.п.

`getExpirationTime()`:

- вычисляет целевой timestamp экспирации:
  - берёт «живое» server time,
  - добавляет `expirationSecondsRef.current * 1000`.

При рендере:

1. Вычисляется «сырой» целевой timestamp.
2. Обновляется `expirationTargetTimeRef` и анимационное состояние.
3. С помощью сглаживания (ease‑функция) плавно двигается `expirationRenderTimeRef` к целевому значению (без рывков при смене таймфрейма).
4. `expirationX` вычисляется как позиция этого времени в текущем viewport.
5. Если `expirationX` попадает в видимую область (с запасом справа под ценовой лейбл), рисуется:
   - **круг** с фоном и обводкой,
   - **шашечный флажок** поверх круга (финиш),
   - **вертикальная линия** от круга вниз до основной области графика.

---

## 10. Итоги и расширение

Ключевые свойства линейного графика:

- **Время‑центричная архитектура**:
  - всё завязано на временном окне и серверном времени,
  - есть стабильная секундная сетка и continuous‑follow.
- **Производительность**:
  - редуцированные точки для рендера,
  - бинарные поиски по времени,
  - один стабильный RAF‑цикл, не зависящий от ререндеров React.
- **UX‑слои**:
  - pan/zoom с инерцией и «возвратом к live»,
  - hover CALL/PUT,
  - полноценная рисовалка,
  - overlay‑сделки,
  - множество индикаторов.

Чтобы расширить функциональность:

- можно добавлять новые индикаторы в общий индикаторный движок,
- можно доработать визуализацию live‑сегмента (цвет, толщина),
- можно изменить поведение зума/пэна, скорректировав лимиты `MIN_WINDOW_MS`/`MAX_WINDOW_MS` и эвристику возврата к follow.

Этот документ покрывает текущую архитектуру линейного графика и может служить базой для дальнейшего развития и отладки.

