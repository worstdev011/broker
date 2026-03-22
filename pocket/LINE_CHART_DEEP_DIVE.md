# Линейный график конкурента — максимально подробный разбор (`pocket/1.js`)

> **Назначение документа.** Зафиксировать *всё*, что в минифицированном бандле относится к режиму **Line** (`dC.M.Line`), чтобы можно было **воспроизвести поведение и внешний вид** в своём терминале: данные, состояние, математика, отрисовка, анимации, UI-слои, константы, ветвления и побочные эффекты.  
> **Ограничение.** Это **реверс по сборке**, не исходники. Имена вроде `lY`, `Qz`, `g8` — внутренние; здесь даны **смысловые имена** в скобках при первом упоминании.

---

## Оглавление

1. [Глоссарий и идентичность режима](#1-глоссарий-и-идентичность-режима)  
2. [Константы и перечисления (выжимка из модулей)](#2-константы-и-перечисления-выжимка-из-модулей)  
3. [Полный поток данных: от сети до `points`](#3-полный-поток-данных-от-сети-до-points)  
4. [`PointsManager`: сырые точки, объёмы, сбросы](#4-pointsmanager-сырые-точки-объёмы-сбросы)  
5. [Редукция `reducedPoints` (математика и оптимизации)](#5-редукция-reducedpoints-математика-и-оптимизации)  
6. [Анимация конца ряда и масштаба Y](#6-анимация-конца-ряда-и-масштаба-y)  
7. [Два рендерера линии: обычный (`lY`) и «performance» (`D6`)](#7-два-рендерера-линии-обычный-ly-и-performance-d6)  
8. [Слои отрисовки, id графических объектов, z-index](#8-слои-отрисовки-id-графических-объектов-z-index)  
9. [Элементы UI, которые существуют *только* или *особенно* на линии](#9-элементы-ui-которые-существуют-только-или-особенно-на-линии)  
10. [Главный цикл: `render` → `prepareToDraw` → элементы](#10-главный-цикл-render--preparetodraw--элементы)  
11. [Окно времени, сдвиг, зум, подгрузка регионов](#11-окно-времени-сдвиг-зум-подгрузка-регионов)  
12. [Расчёт min/max по вертикали (линия)](#12-расчёт-minmax-по-вертикали-линия)  
13. [Индикаторы, объёмы, свечи «для низа» при линейном графике](#13-индикаторы-объёмы-свечи-для-низа-при-линейном-графике)  
14. [Цвета и стили (зафиксированные в коде)](#14-цвета-и-стили-зафиксированные-в-коде)  
15. [Таблица `kd.Ay.CHART` (релевантное линии)](#15-таблица-kdaychart-релевантное-линии)  
16. [Чеклист для своей реализации (пошагово)](#16-чеклист-для-своей-реализации-пошагово)  
17. [Что остаётся неизвестным без перехвата трафика](#17-что-остаётся-неизвестным-без-перехвата-трафика)

---

## 1. Глоссарий и идентичность режима

| Ярлык в документе | Смысл в бандле |
|-------------------|----------------|
| **Line-режим** | `chartType === dC.M.Line`, числовое значение **`1`** |
| **`isLineChart()`** | Метод базового графического элемента: `(0, uC.Mt)(this.selectedPlotType)` |
| **`uC.Mt(t)`** | `return t === i.M.Line` (строгое сравнение с константой Line) |
| **`uC.o0(chartType, chartPeriod)`** | Для Line **всегда возвращает `1`** (секунда на «элемент» таймфрейма для линии); для остальных типов — секунды периода из таблицы `Jm` |
| **`Plot` / `g8`** | Основной контроллер чарта (создаётся в React как `new g8(chartId, …)`), держит `pointsManager`, аниматоры, элементы |
| **`PointsManager` / `ZJ`** | Хранит `points`, `reducedPoints`, `currentTime`/`currentValue`, `candles`, `volumes` |
| **`FI`** | Точка **цена–время** `{ value, time }`; в редуцированных точках дополнительно могут жить min/max поля конструктора |
| **`lY` (класс линии)** | Наследник базового элемента `MI`: рисует линию + опциональную заливку + делегирует min/max в `S6` |
| **`D6`** | Наследник `lY`: **упрощённый** путь при WebGL performance — один `dynamic plot`, градиент через `getDynamicGradient` |
| **`tX` / `JY`** | **Точка на конце линии** (glow + круг) — в список элементов попадает **только** если Line |
| **`IQ`** | Элемент **горизонтали текущей цены** + прямоугольник с ценой + ветки double-up |
| **`S6`** | Плашки **min/max** на графике (цена в момент экстремума) |

**Redux/UI:** строка `traderoom_charts__line` в массиве типов графика соответствует тому же семейству, что и `dC.M.Line` (иконки `/themes/cabinet/svg/icons/chart-types/...`).

---

## 2. Константы и перечисления (выжимка из модулей)

### 2.1 Типы графика `dC.M`

| Ключ | Значение |
|------|----------|
| `Line` | **1** |
| `Candles` | 2 |
| `Bars` | 3 |
| `HeikenAshi` | 5 |

Линейный режим — **только** `Line === 1`.

### 2.2 Слои рендера `dC.Rp` (где живёт линия)

Для линии используются в первую очередь:

- **`CANDLES` (25)** — динамическая графика линии, заливки, хвостов/основной части  
- **`MINMAX` (27)** — прямоугольники и подписи экстремумов  
- **`GRID` (10)** — сетка, подписи свечных OHLC (для линии блок OHLC **не** рисуется)  
- **`POINT` (120)** — текст/элементы точки курсора  
- **`my.POINT_GLOW` / `my.POINT_DOT`** — свечение и ядро точки на линии  

Полный список см. модуль `16953` в бандле.

### 2.3 Кривые easing `dC.EK` (используются аниматорами)

| Имя | Число |
|-----|-------|
| `Linear` | 0 |
| `EaseOutQuad` | 2 |
| `EaseInOutQuad` | 3 |
| `EaseOutQuart` | 8 |
| `EaseOutQuint` | 11 |

**Фактические привязки:**

- **Min/max шкала графика:** аниматоры `minValueAnimator` / `maxValueAnimator` создаются как **`Qz(defaultDuration, dC.EK.EaseOutQuad)`**, где **`defaultDuration = 0.1`** (секунды логического времени `ts` кадра).  
- **Точка на линии (`JY`):** `animator = new Qz(1.5, dC.EK.EaseOutQuart)`, `setToValue(1)`, **`circularTo = true`** — пульсация радиуса glow.

---

## 3. Полный поток данных: от сети до `points`

### 3.1 Реалтайм: `updateQuotes`

**Триггер:** обновление котировок (массив сделок/тиков в пропсах или коллбеке — в бандле виден обработчик метода класса чарта).

**Алгоритм:**

1. Если **`!loadedHistory`** — **выход без действий** (история ещё не готова).  
2. Фильтр входного массива:  
   - `item.asset === this.props.symbol`  
   - `isGoodPointValue(item.price)`  
3. Маппинг: `{ value: item.price, time: item.time }` (время берётся как есть из объекта котировки).  
4. Если массив не пуст:  
   - **`plot.updateRealtimeVolumes(normalized, chartType, chartPeriod)`**  
   - **`plot.addPoints(normalized)`**

**Валидация `isGoodPointValue(x)`:**

- `Number.isFinite(x)`  
- `x !== Number.MAX_VALUE && x !== Number.MIN_VALUE`

Иными словами, **любая нечисловая/бесконечная/заглушечная цена отбрасывается**.

### 3.2 Первая загрузка истории: `onInitialHistoryLoad`

**Условия раннего выхода:**

- `payload.asset !== symbol`  
- `payload.period !== dC.VJ[this.props.chartPeriod]` (маппинг UI-периода в числовой период сервера)  
- `state.loadedHistory === true`

**При успехе:**

1. `setState({ loadedHistory: true })`  
2. `r = convertUpdateHistoryFast(payload)`  
3. `plot.clear()`, `plot.refresh()`, **`plot.addPoints(r)`**  
4. `setVolumesFromHistory`, кнопки call/put refresh, сброс зума, индикаторы/рисунки, `zoomPlot()`, размер, **`plot.render(Date.now()/1000)`**

### 3.3 `convertUpdateHistoryFast` — пошагово

**Вход:** `t = { period, history, candles? }`.

**Переменные:**

- `e = period`  
- `n = history` (массив «сырых» точек)  
- `r = candles`  
- `i = n` (рабочая копия history)  
- `o = []` — буфер синтетических точек из свечей  

**Ветка «свечи → точки для линии»** (только если **`e >= 5`** и **`r.length > 0`**):

Для каждой свечи `r`:

1. `H7(t, 5)` разбивает кортеж свечи на пять скаляров: **`[r, i, a, s, c]`** в коде (имена в минификаторе): фактически это **time + OHLC** (точный порядок полей задаётся `H7`; для реплики достаточно знать, что из свечи извлекаются **время периода** и **open, high, low, close**).  
2. В `o` пушатся пары **время → цена** с **искусственным сдвигом секунд** внутри периода:  
   - `[r, i]` — первая точка (open)  
   - `[r + 1, s]` — high  
   - `[r + 2, c]` — low  
   - `[r + e - 1, a]` — close  

То есть **одна свеча превращается в до четырёх точек линии**, разнесённых по времени, чтобы полилиния имела **форму внутри периода**, а не одну точку.

**Слияние с history:**

- Находится `a = max(history[].time)` (по первому элементу кортежа после `H7(t,1)`).  
- Из `o` отфильтровываются точки с `time < a`, которых ещё нет в `i`.  
- Результат: `i = i.concat(filtered)`

**Финальный маппинг:**

Каждый элемент `i` прогоняется через `H7(t, 2)` → `[timeRaw, valueRaw]`:

```js
{ value: parseFloat(valueRaw), time: parseFloat(timeRaw) }
```

Сортировка по **`time` ascending**.

**Итог:** массив **однородных** `{ time, value }`, уже пригодных для `addPoints`.

### 3.4 Подгрузка региона для линии: `onLineRegionLoad`

**Вход:** `{ index, asset, data }`.

**Условия:** `asset === symbol` и `index` в списке ожидающих регионов.

**Шаги:**

1. Массив `o = []`.  
2. Если в графике уже есть точки **и** (`data[0].time === points[0].time` **или** `data` пустой):  
   - Берётся регион `a` из `plot.regions` с этим `index`.  
   - `s` — первая точка на графике, `c = s.time`, `l = s.value`.  
   - Если `a` есть и цена хорошая:  
     - `u = parseInt(a.time - a.offset)`, `d = parseInt(c)`  
     - Цикл **`f` от `u` до `d`**: пуш **`{ time: f, value: l }`** — **горизонтальное заполнение** от начала загружаемого куска до первой известной точки **той же ценой**.  
3. Для каждого элемента `data`: `time`, `price` → при хорошей цене пуш `{ time, value: price }`.  
4. Если `o.length`: `addPoints(o)`, `recalculateAllVolumesFromPoints()`, `render`, `onRegionLoaded`, снять pending. Иначе `disableLoadRegion()`.

**Смысл:** при подгрузке влево **не оставлять разрыв** между новым регионом и уже нарисованным хвостом.

### 3.5 Свечной регион (не Line-режим загрузки, но общий движок)

`onCandleRegionLoad` строит **несколько** `{ time, value }` на одну свечу (open/high/low/close на смещениях). Для **линии** приходит **`onLineRegionLoad`**, но **внутреннее представление** всё равно точки.

---

## 4. `PointsManager`: сырые точки, объёмы, сбросы

### 4.1 `addPoint(value, time, chartType)`

**Предусловие:** `value > 0 && time > 0` (иначе игнор).

**Ветки:**

1. **Первый тик** (`points.length === 0`): `push(new FI(value, time))`.  
2. **Есть история:**  
   - `i = last point`, `o = first point`.  
   - Если **`i.time === time`**: **заменить** последнюю точку на `new FI(value, i.time)` — обновление «текущей секунды».  
   - Иначе если **не** (`o.time <= time < i.time`) — вставка «в середину» **не** делается этим методом (такие случаи обрабатываются сортировкой после bulk `addPoints`).  
   - Иначе если **Line** (`uC.Mt(chartType)`) и **`time > i.time`**:  
     - `a = floor(time) - floor(i.time)`  
     - Если **`a > 1`**: для `s = 1..a` если `i.time + s < time` пуш **`new FI(i.value, i.time + s)`** — **ступенчатое плато** с шагом 1 секунда и **ценой предыдущего закрытого тика**.  
     - Затем `push(new FI(value, time))`.  

**Эффект:** при пропуске секунд линия **не «телепортируется» по диагонали**, а идёт **горизонтально**, затем вверх/вниз на новом времени.

### 4.2 Сортировка `sort(mode)`

Режимы `IJ`: `DEFAULT` (обычный sort по time), `HEAP`, `QUICK` с частичной сортировкой хвоста. После **массовой** загрузки вызывается сортировка.

### 4.3 `setStartEndPoints`

- `digits` → множитель `t = 10^digits`.  
- `startPoint = points[0]`, `endPoint = points[last]`.  
- **`targetValue = round( (endPoint.value * t + reduceRestSum) / ((reduceRestCount + 1) * t), digits)`** — учёт **незавершённого бакета** редукции.  
- `targetTime = endPoint.time`.  
- Если `currentValue` / `currentTime` ещё «не инициализированы» (`FLT_MAX`), выставить в целевые.

### 4.4 `reset()`

Обнуляет: `fromTime`, `toTime`, start/end, `target*`, `candleWidth`, `current*`, массивы `points`, `volumes`, `candles`, `reducedPoints`, `interval`, остатки редукции, `lastProcessedPrice`.

### 4.5 Объёмы в Line-режиме: `updateRealtimeVolumes`

Если **`volumes.length === 0`**, выход.

Период бакета для линии:

- **`i = getLinePlotCandlePeriod()`** = **`max(1, pointsManager.interval)`** (см. ниже).

Для каждой входной точки `{ time, value }`:

1. `bucketTime = floor(time / i) * i`  
2. Найти/создать объект `{ time: bucketTime, value: count }` в `volumes`  
3. Если **`value !== lastProcessedPrice`**, инкремент **`o.value`** (счётчик «смен цены» в бакете)  
4. `lastProcessedPrice = value`

**Смысл:** объём на линии — **не классический объём сделок**, а **частота изменения цены** внутри временных корзин (для индикатора объёма).

### 4.6 `setVolumesFromHistory`

Смешивает **`candles`** (кортежи с полем volume) и **`history`**: строит счётчики тиков по бакетам периода **`uC.o0(chartType, chartPeriod)`** (для линии это **1 сек**), мержит с серийными объёмами. Детали — вложенные циклы в бандле; для клона достаточно понимать **назначение**: получить массив `{ time, value }` объёмов, согласованный с историей.

---

## 5. Редукция `reducedPoints` (математика и оптимизации)

### 5.1 Зачем

Сырые `points` могут содержать **много тиков на пиксель**. Для отрисовки линии строится **упрощённая** последовательность **`reducedPoints`** с шагом **`interval`** (в единицах времени графика, для линии это **секунды**).

### 5.2 Вычисление `interval` в `calculateReducedPoints(t, e, n)`

- `r = n / kd.Ay.CHART.OPTIMAL_SECOND_WIDTH` — **целевое** число секунд на ширину окна `n` (в бандле `n` — ширина видимой области в пикселях или логическая ширина окна времени; фактически сравнивается с `visibleTimeRange`).  
- `i = floor((e - t) / r)`  
- `o = interval ? ceil((e-t)/interval) : 0`  
- Если **изменение малое**: `abs(o - r) < 0.2 * r` **или** `i === interval` **и** уже есть `reducedPoints` → **return false** (не пересчитывать).  
- Иначе **`interval = i`**, собрать все `points` с `time in [getTimeFromInterval(t), e]`, вызвать **`reCalculateReducedPoints(...)`**.

**`OPTIMAL_SECOND_WIDTH` в константах = `5`** — базовая «плотность» пикселей на секунду для подбора бакетов.

### 5.3 `reCalculateReducedPoints(points, interval, precisionMultiplier, digits, flagA, flagB)`

**Идея:** идти по отсортированным точкам, накапливать **сумму цен × precisionMultiplier** и **min/max**, пока `time < nextBucketStart`; на границе бакета:

- Среднее: `avg = round(sum / (count * precisionMultiplier), digits)`  
- Пуш новой точки **`FI(avg, bucketTime, min, max)`**  
- Сброс аккумуляторов  

**Особый случай последней точки ряда:** если `flagA` и последняя точка совпадает с последним тиком `points`, в **`reduceRestSum` / `reduceRestCount`** сохраняется **остаток** незакрытого бакета — для **`targetValue`**.

### 5.4 `getReducedAndAnimatedPoints`

1. `t = reducedPoints.slice()`  
2. Если пусто → `[]`  
3. Если **`lastReduced.time === endPoint.time`** — **удалить** последнюю редуцированную (она «мертвая» для хвоста).  
4. Пуш **`new FI(currentValue, currentTime)`** — **живая** концовка.

### 5.5 `checkReducedPoints` / `needToCalculateReducedPoints`

Если хвост ушёл далеко от `currentTime` (порог **`max(3, 2*interval)`** по модулю разницы времени), вызывается **`calculateReducedPointsToEnd`** — догоняющий пересчёт от последнего reduced time до конца `points`.

### 5.6 Связь с Ichimoku

**`shouldCalculatePointsToEnd()`** у Plot возвращает **`true`**, если среди индикаторов есть **`kd.W.ICHIMOKU_CLOUD`**. Тогда на **каждом кадре** Line-режима вызывается **`checkReducedPoints(this.shouldCalculatePointsToEnd())`** — **агрессивнее** обновлять хвост редукции.

---

## 6. Анимация конца ряда и масштаба Y

### 6.1 `updateCurrentValues` (логика «1/6»)

Вызывается **каждый кадр** из `render`, пока есть точки и инициализированы текущие значения.

**Время:**

- Если **`targetTime - currentTime > 3`** (секунды): **форс** `currentTime = targetTime`, `currentValue = targetValue` — резко догнать, если сильно отстали.  
- Иначе:  
  - `n = currentTime + (targetTime - currentTime) / 6`  
  - Если есть `points[length-2]` и его время **`> n`**, подправить `n` ближе к предпоследней точке (ветка `e = true`).  
  - `currentTime = n`  

**Значение:**

- Если `currentValue` ещё `FLT_MAX` → присвоить `targetValue`.  
- Иначе `base = e ? points[len-2].value : currentValue`  
- `currentValue = roundCurrentValue(base + (targetValue - base) / 6)`

**Почему так:** плавное **догоняние** без отдельной библиотеки твинов на каждый тик; визуально — «гибкий» хвост.

### 6.2 Универсальный аниматор `Qz` (`Zz`)

Поля: `curveType`, `time`, `startTime`, `fromValue`, `toValue`, `currentValue`, **`duration`**, `timeout`, `enabled`, `circular`, `circularTo`, флаги расчёта.

**`setToValue(v)`:** если новое значение, **`startTime = time`**, сброс `calculated`.

**`calculateValue()`:** если кривая завершена (`currentValue === toValue`), обновляет `fromValue` (кроме circular режимов).

Используется для:

- **min/max** шкалы (duration 0.1, EaseOutQuad)  
- **shift**, **secondWidth** (зум)  
- **пульса точки** (1.5 c, EaseOutQuart, circular)

### 6.3 Min/max при вертикальном скролле

В `calculateMinMax`: если пользователь крутит вертикальный скролл (`plotVerticalScroll.isHandling`), **`duration` аниматоров min/max = 0.1** даже сильнее, чем обычные 0.1 — в коде то же число, но ветка явная.

---

## 7. Два рендерера линии: обычный (`lY`) и «performance» (`D6`)

### 7.1 Выбор

В **`actualizeMainElement`**:

```js
this.chartType === dC.M.Line
  ? (this.core.isPerformanceLines
      ? new D6(core, pointsManager, minMaxElement, { showArea })
      : new lY(...))
  : ...
```

**`isPerformanceLines`** выставляется как **`isPerformanceMode && isWebGLRenderer()`** при инициализации core.

### 7.2 Общее родительское поведение (`MI`)

Базовый класс даёт:

- **`getXFromTime(t)`** = `(t - startPoint.time) * secondWidth - shift` (через `pointsManager`/`plot`)  
- **`getYFromValue(v)`** — линейная интерполяция между **`minVal`/`maxVal`**, с отступами **`topMarginPixels`/`bottomMarginPixels`**, **`yShift`**  
- **`filterPoints(arr)`** — отсечь по **`[getTimeFrom() - pad, getTimeTo() + pad]`**, где **`pad = getSecondsInCandle()`**  
- Для линии **`getSecondsInCandle()` возвращает константу `5`** секунд (не зависит от ширины свечи)  
- Флаги инвалидации: размер, тема, min/max, сдвиг окна, высота, нижний маржин, `forceCleared`, смена `showArea` и т.д.

### 7.3 Обычный путь `lY` — детали отрисовки

**Инициализация (`init`):**

- `mainLineChartId = "main-line"`  
- `tailLineChartId = "tail-line"`  
- `areaGradientId = "area-gradient"`  
- `areaAlpha`: **0.01** если WebGL renderer, иначе **0.15**  
- WebGL: **`areaShaderFilter`** с цветами **`4a76a8`** с альфами **0.8 / 0.4**, параметр **0.2** (см. конструктор в бандле)

**`drawLine(points, id)`:**

- `getDynamicGraphics(Rp.CANDLES, id, { smooth: true }).graphics`  
- `lineStyle({ width: 2, scaleMode: VERTICAL, color: plotLineColor, alpha: 0.8, join: ROUND })`  
- Для каждой точки: первый `moveTo(x, y+1)`, далее `lineTo(x, y+1)` — **систематический сдвиг +1px по Y**

**`drawArea(points, id)`:**

- Замкнутый полигон: от `(x0, yShift+height)` вверх по линии, вниз к правому низу, замыкание  
- `beginFill(plotLineGradientTopColor, areaAlpha)`  
- WebGL: на graphics вешается **`filters = [areaShaderFilter.filter]`**

**`draw()`:**

1. Тема сменилась → `initColors()`  
2. `filtered = filterPoints(getReducedAndAnimatedPoints())`  
3. Построить массив пикселей `{x,y}`; **пропуск** пар полностью левее экрана (`x < 0 && xNext < 0`)  
4. Если **`length < 3`** — **ничего**  
5. `dividerCount`: если 0 или `> n-2`, установить **`n - 2`**  
6. `a = slice(0, dividerCount)`, `s = slice(dividerCount - 1)` — **перекрытие на одну точку** между main и tail  
7. Если **`s.length > 100`** — **`dividerCount = 0`** (на следующем кадре пересчитает) — защита от огромного хвоста  
8. `shouldRedrawMainPart(a0, a1)` / `shouldRedrawTailPart(s0, s1)` — сравнение **X-координат** концов с прошлым кадром + базовые флаги  
9. При необходимости: clear main/tail, `drawLine`  
10. Если main или tail перерисованы: clear area, при **`showArea`** — `drawArea(fullPixelArray, areaGradientId)`  
11. **`drawMinMaxElements(filtered)`** — по **исходным** `(time,value)` из отфильтрованного ряда (не по min/max полям reduced)

**`drawMinMaxElements` для линии (не путать со свечами):**

- Ищет max **value** и min **value** среди точек с временем внутри видимого окна (через `getTimeFrom`/`getTimeTo` в данных)  
- Вызывает **`minMaxElement.drawMaxValue({value,time})`** и **`drawMinValue`**

### 7.4 Performance путь `D6` — отличия

- **`plotId = "plot-optimized"`**, **`gradientId = "plot-gradient-optimized"`**  
- Использует **`core.getDynamicPlot`** вместо кусковых `lineTo` в CANDLES-слое для полилинии  
- **`initColors`:** `plot.tint = plotLineColor`, `plot.lineStyle(2)`, `plot.alpha = 0.8`  
- **Градиент заливки:** `getDynamicGradient`, цвета **top/bottom** из `plotLineGradientTopColor` / `plotLineGradientBottomColor` с их альфами  
- **`draw`:** `plot.clear()`, тот же pipeline фильтрации точек, **`topPoint`** = min Y среди maxVal и последней точки (для градиента), **`drawPlot`** = только `lineTo` подряд (без явного `moveTo` в фрагменте — кривая продолжается после clear)  
- **Нет** разбиения main/tail — всё в одном plot; **проще CPU/GPU баланс**  
- `destroy`: уничтожить dynamic plot + gradient

---

## 8. Слои отрисовки, id графических объектов, z-index

### 8.1 Динамические id (Line, обычный режим)

| id | Назначение |
|----|------------|
| `main-line` | Стабильная часть полилинии |
| `tail-line` | Последние сегменты (часто перерисовываются) |
| `area-gradient` | Заливка под кривой |
| `candles-max-<chartId>` / `candles-min-<chartId>` | Плашки экстремумов (название исторически «candles») |

### 8.2 Точка на конце (`JY`)

- Контейнеры **`my.POINT_GLOW`** и **`my.POINT_DOT`**  
- Glow: `beginFill(39673, alpha, true)` — **фиксированный цвет** (десятичный ARGB/RGB в движке)  
- Круг ядра: радиус **4**, заливка **`valuePointCenterColor`**, обводка белая `0xFFFFFF` с альфой 0  
- Радиус glow: **`20 * animator.getValue()`**, минимум **0.1**  
- Позиция: **`(getXFromTime(currentTime), getYFromValue(currentValue))`**  
- **Видимость:** `getTimeFrom() <= currentTime <= getTimeTo()` и есть точки

### 8.3 Горизонталь текущей цены (`IQ`)

Ключевые константы рядом в коде: **`wQ = 2`** — зазор справа.

- Горизонталь **`CURRENT_PRICE_LINE`** от `x=0` до **`u = width - labelWidth - wQ`** (если нет double-up)  
- Плашка: `drawRoundedRect(u, y - l/2, c, l, 4)` с заливкой **`valueLineColor`**  
- Текст цены: стиль **`TEXT_STYLE_CURSOR_TIME`**, позиция `x = u + VALUE_BG_HORIZONTAL_MARGIN`  
- **Double-up:** участки линии окрашиваются в call/put цвета с **пунктирным шейдером** (`dash: 5`, `gap: 5`)  
- **Вертикаль «сейчас»:** если **`hideBoFeatures && isLineChart`**: пунктир от **`(getXFromTime(currentTime), 0)`** до **`(..., height)`** — **временная метка** на всю высоту области графика

---

## 9. Элементы UI, которые существуют *только* или *особенно* на линии

| Элемент | Поведение на Line |
|---------|-------------------|
| **`pointElement` (`tX`)** | Добавляется в список отрисовки **только** если `uC.Mt(chartType)` |
| **Подписи OHLC у курсора (`OY.drawCandleValues`)** | Вызывается только если **`!isLineChart()`** — на линии **нет** блока Open/High/Low/Close в углу |
| **`candlesTimer` + позиция текста** | Если таймер свечи есть и **не** линия — сдвиг по X от виджета таймера; на линии — **`getXFromTime(currentTime) + 10`** |
| **Привязка сетки (`enableGridSnapping`)** | Если включена **и не** линия — snap; **на линии сетка не снапится** к «свечным» границам |
| **Индикаторные «свечи»** | Для overlay: **`reducedPoints`** вместо `candles` |
| **Ширина гистограммы** | `getHistogramCandleWidth()` → **1** на линии |
| **Секунды в «свече» для фильтра** | фиксированные **5** секунд |
| **Расчёт ширины свечи** | Для линии `calculateCandleWidth` вызывается в ветке, где для свечей это важно; для самой линии ширина свечи **не** используется в отрисовке линии |

---

## 10. Главный цикл: `render` → `prepareToDraw` → элементы

### 10.1 `render(t)` (аргумент `t` = **unix time в секундах**, обычно `Date.now()/1000`)

Ранний выход если `destroyed`.

1. Обновить **`currentServerTime`** из `globalSettings.currentTime`, вызвать **`checkServerTimeDependentTasks`** при изменении.  
2. **`ts = t`**, **`prepareToDraw()`**  
3. Если **`pointsManager.currentValue === FLT_MAX`** — **не рисовать** (данные ещё не готовы)  
4. **`core.clear()`**  
5. Если есть точки:  
   - **`updateCurrentValues()`**  
   - **Если Line:**  
     - **`checkReducedPoints(shouldCalculatePointsToEnd())`**  
     - **`calculateMinMax()`**  
   - **Если не Line:** при видимой последней точке — `calculateWindowParams({ calculateCandles: true })`  
   - **`handleElements()`** — проставить всем элементам актуальные поля (`shift`, `secondWidth`, `minVal`/`maxVal` из аниматоров, `currentTime`, `pointer*`, …)  
   - **`calculateIndicators()`**  
   - **`drawingsManager.calculatePoints()`**  
   - **`drawElements(list)`** — у каждого `needToDraw()` → `draw()` → `onAfterDraw()`  
   - **`drawScrollToEnd()`**  
6. **`getParams()`**, **`checkRegion()`**, **`checkIndicatorPeriods()`**  
7. **`core.render()`**, `forceCleared = false`

### 10.2 `prepareToDraw`

- Проставить время всем аниматорам: min, max, shift, secondWidth.  
- Сбросить счётчики margin/элементов.  
- **`currentZoom = secondWidth`**  
- **Инерция скролла:** каждые **0.02с** (`floor(ts/0.02)`) при ненулевом **`acceleration`**: ослабление на **`kd.Ay.CHART.ACCELERATION_WEAKNESS_IN_SECOND` (22)** за секунду модели, сдвиг через **`shiftAnimator`**, `checkShift()`.

### 10.3 Порядок элементов в `handleElements` (база)

Массив включает (не полный перечень зависимостей): draggable точки рисунков, индикаторы, опционы, соц-сделки, **`valueLineElement`**, **`cursorElement`**, **`minMaxElement`**, (на десктопе) алерты/пендинги, **`pointElement` если Line**, элементы **регионов** загрузки, **`candlesTimer`**, **`gridElement`**, **`gatesElement`** если не `hideBoFeatures`, **`currentElement`** (линия или свечи), затем пересчёт `bottomMargin` с **`TIMELINE_HEIGHT`**.

---

## 11. Окно времени, сдвиг, зум, подгрузка регионов

### 11.1 Преобразования координат

- **`getTimeFromX(px)`** = `startPoint.time + px / secondWidth` (через `pointsManager`)  
- **`getXFromTime(time)`** = `(time - startPoint.time) * secondWidth - shift`

### 11.2 Видимый диапазон для фильтрации

- **`getTimeFrom()`** = `getTimeFromX(shift) - averageShift * pointsInElement` (с защитой от NaN)  
- **`getTimeTo()`** = `getTimeFromX(shift + width) - ...`  

Для **индикаторов** `pointsInElement` берётся из **`uC.o0(chartType, chartPeriod)`** (=1 для линии), для самих индикаторов иногда **`getPointsInElementForIndicators()`**.

### 11.3 `calculateWindowParams` (ветка Line)

Если **`chartType`** не свечи/бары/хейкин:

- `u = getTimeFromX(shift)`, `d = getTimeFromX(shift + width)`  
- **`pointsManager.calculatePoints(u, d, width, toEndFlag)`** — обновление reduced/merge  
- Флаг `c` = изменился ли `interval`  
- Если есть **нижний индикатор** — может пересчитать **`candles`** с периодом **`getLinePlotCandlePeriod()`** для гистограмм/объёма  

**`calculateCandleWidth(s, a)`** в конце `calculateWindowParams` записано как:

`(uC.Mt(this.chartType) && !i) || this.pointsManager.calculateCandleWidth(s, a)`

Из‑за приоритета `&&` над `||` это **`((Line && !calculateCandlesFlag) || результатВызова)`**:

- **Линия и `calculateCandles: true`** (флаг `i === true`, значение по умолчанию в большинстве вызовов): `true && false` → ложь → **второй операнд вычисляется** → **`calculateCandleWidth` вызывается**.  
- **Линия и `calculateCandles: false`**: `true && true` → истина → **вызов `calculateCandleWidth` пропускается** (короткое замыкание).  
- **Не линия:** первая часть ложна → **`calculateCandleWidth` вызывается**.

То есть на линии ширина «свечи» для индикаторов пересчитывается **везде, кроме** оконных пересчётов с **`calculateCandles: false`**.

### 11.4 Подгрузка региона влево

- **`checkRegion`:** если **`enableLoadRegion && shift < 0`** → `loadRegion(startPoint.time)`  
- **`loadRegion`:** размер окна запроса **`offset = (n < 60 ? 200 : 150) * n`**, где **`n = uC.o0(chartType, chartPeriod)`** → для линии **`n = 1`**, значит **200 секунд** истории за запрос (если серверная логика следует этому контракту)  
- Генерируется **`NEW_REGION_REQUEST`** с `index`, `time`, `offset`, период

### 11.5 Индикаторы и запас истории

`checkIndicatorPeriods`:

- `t = max(indicator.maxPeriod) + 1`  
- `i = uC.o0(n, r)`; **если Line** — **`i *= (pointsManager.interval || 1)`**  
- Нужный запас в пикселях сдвига: **`t * i`**; если **`shift/secondWidth < t*i`** — догрузить регион от **`points[0].time`**

---

## 12. Расчёт min/max по вертикали (линия)

**Источник:** `getReducedAndAnimatedPoints()` (уже с анимированным хвостом).

Для каждой точки в видимом окне по времени:

- **`value < min`** → min  
- **`value > max`** → max  

Если **все значения совпали** (`min === max`) и точек **больше одной**:

- **`max += 0.1 * max`**, **`min -= 0.1 * min`** — искусственный зазор, чтобы линия не была «нулевой толщины».

Учитывается **вертикальный скролл** (`plotVerticalScroll.minMaxShift`): сдвиг границ.

Аниматоры:

- `minValueAnimator.fromValue` / `maxValueAnimator.fromValue` берутся из предыдущего кадра или текущего значения аниматора  
- **`setToValue(newMin/newMax)`**  
- **`duration`** = 0.1 при активном вертикальном скролле, иначе **`defaultDuration` (0.1)** — в бандле оба совпадают, ветка оставлена для отличия сценариев

---

## 13. Индикаторы, объёмы, свечи «для низа» при линейном графике

- **`getCandlesForIndicator`:** для Line и позиции **не Bottom** — **`reducedPoints`**; иначе обычные **`candles`**.  
- **`calculateCandles(getLinePlotCandlePeriod(), secondWidth, ...)`** вызывается для нижних индикаторов, чтобы построить **свечной ряд** из тиков с периодом **`max(1, interval)`**.  
- При добавлении **нижнего** индикатора в Line-режиме вызывается **`calculateWindowParams({ calculateCandles: true })`**.  
- При удалении последнего индикатора на линии — **`resetCandles()`**.

---

## 14. Цвета и стили (зафиксированные в коде)

| Что | Значение |
|-----|----------|
| Линия (обычная) | `plotLineColor` базово из темы **`4a76a8`**, альфа линии **0.8** |
| Заливка верх | `plotLineGradientTopColor` |
| Заливка низ | `plotLineGradientBottomColor` (в performance-градиенте) |
| WebGL area shader | оттенок **`4a76a8`** с альфами **0.8 / 0.4**, см. `initColors` в `lY` |
| Glow точки | заливка **`39673`** (десятичное) с динамической альфой **`1 - n`** |
| Ядро точки | **`valuePointCenterColor`** |
| Сетка / курсор тексты | см. `TEXT_STYLE_*` в таблице ниже |

---

## 15. Таблица `kd.Ay.CHART` (релевантное линии)

| Константа | Значение | Применение к линии |
|-----------|----------|-------------------|
| `OPTIMAL_SECOND_WIDTH` | **5** | Расчёт `interval` редукции |
| `TIMELINE_HEIGHT` | **20** | Нижняя полоса времени, клип курсора |
| `VALUE_BG_HORIZONTAL_MARGIN` | **7** | Отступы плашки цены |
| `VALUE_BG_VERTICAL_MARGIN` | **4** | Высота фона цены |
| `MIN_SECOND_WIDTH_TO_SHOW_MS` | **7** | Порог для `shouldShowMs` на линии |
| `ACCELERATION_WEAKNESS_IN_SECOND` | **22** | Затухание инерции сдвига |
| `RIGHT_PLOT_MARGIN_PERCENT` | **35** | Правый запас (скролл к концу) |
| `TOP_PLOT_ELEMENT_PIXELS` | 120 | Высота верхних индикаторов |
| `BOTTOM_PLOT_ELEMENT_PIXELS` | 120 / 180 expanded / 80 mobile | Нижние индикаторы |
| `BOTTOM_PLOT_ELEMENT_VERTICAL_PADDING` | 10 | Вертикальные поля внутри панелей |
| `TOP_PLOT_MARGIN_PIXELS` | 100 (90 mobile) | Overlay margin |
| `BOTTOM_PLOT_MARGIN_PIXELS` | 15 (30 mobile) | Overlay margin |
| `MIN_MAX_MIN_DIFF` | 0.5 | Раздувание плоских индикаторных шкал |
| `TEXT_STYLE_CURSOR_TIME` | Noto Sans 11 white | Цена у курсора / текущая цена |
| `TEXT_STYLE_BET` | Noto Sans 12 | Плашки min/max |
| `ZOOM_FACTOR` | 0.1 | Шаг зума |
| `ZOOM_BTN_FACTOR` | 0.3 | Кнопочный зум |

Плашки min/max (**`S6`**): внутренние отступы **`x6.X = 10`**, **`x6.Y = 2`**, скругление **6**, сдвиг по Y **±10** от якорной точки.

---

## 16. Чеклист для своей реализации (пошагово)

1. **Модель данных:** строго `{ time, value }`, время в **секундах** (как у них), сортировка.  
2. **Вставка тика:** замена на равном `time`; на линии — **заполнение секунд плато** при `floor` разрыве > 1.  
3. **Редукция:** бакеты по `interval`, среднее в бакете, min/max в бакете, остаток для `targetValue`.  
4. **Хвост:** убрать последний reduced если совпадает с `endPoint`, добавить `(currentTime, currentValue)`.  
5. **Сглаживание хвоста:** каждый кадр сдвиг **1/6** к target; форс если отставание > **3с**.  
6. **Вертикаль:** min/max по reduced+animated в окне; если плоско — раздвинуть на **10%**; анимация границ **EaseOutQuad** за **0.1с** логического времени.  
7. **Горизонталь:** `secondWidth`, `shift`, преобразования time↔x как у них.  
8. **Отрисовка:** два слоя линии (main/tail) **или** один оптимизированный plot; stroke **2px**, alpha **0.8**, join **round**, **+1px** к Y.  
9. **Заливка:** полигон + альфа 0.15 (Canvas) / шейдер (WebGL).  
10. **Точка конца:** пульсирующий glow + круг r=4.  
11. **Текущая цена:** линия до плашки, rounded rect **radius 4**, отступы как в константах, зазор **`wQ=2`**.  
12. **Опция `hideBoFeatures`:** вертикальная пунктирная линия по `currentTime`.  
13. **Фильтр видимости:** ±**5с** к окну.  
14. **rAF:** каждый кадр вызывать логику обновления с **одним и тем же `ts`**.  
15. **Регионы влево:** паддинг ценой первой точки на диапазоне.  
16. **История со свечами:** развернуть в 4 точки на период при `period >= 5`.

---

## 17. Что остаётся неизвестным без перехвата трафика

- Точный **JSON** событий сокета (имена событий, вложенность).  
- Смысл некоторых полей **`H7`** (порядок полей в кортеже свечи/истории) — нужен один реальный sample payload.  
- Серверная семантика **`time`** (UTC vs локальная, миллисекунды или только секунды) — на клиенте везде float.  
- Политика **`emitChangeSymbol`** и ответов **`onLineRegionLoad`** при ошибках.

---

*Документ сгенерирован по реверсу `pocket/1.js` (webpack `main`). При обновлении бандла у конкурента отдельные числа/ветки могут отличаться — сверяйте по строкам.*
