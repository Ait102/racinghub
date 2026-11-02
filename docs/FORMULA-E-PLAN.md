# Formula E — постановка для Codex

Прочитай этот файл целиком, затем `docs/HANDOFF.md`, `README.md`, `docs/MAINTENANCE.md`, `docs/TESTING.md`, `src/series/wec/README.md`. Первым сообщением коротко скажи пользователю, что понял и с какого этапа начнёшь.

## 1. Цель

Третий раздел сайта — **Formula E** (`#/fe/…`), по возможностям как F1, в **чёрно-фиолетовой** теме. Работа идёт **этапами** (0 → 3). После каждого этапа: все проверки зелёные, документация обновлена, дан текст коммита на русском. **Коммитит и пушит только пользователь.**

## 2. Правила проекта (обязательны)

- Ничего не выдумывать: нет данных — «—» или «нет у источника». Очки и места — как у источника, **без пересчёта и суммирования**.
- Под каждым блоком данных — источник и время загрузки (`DataState`/`MetaLine`). Если весь экран из одного запроса — одна строка источника.
- Фото — только Commons со свободной лицензией, автор и лицензия под фото (`src/api/wikimedia.ts`, `PhotoFigure`). Нет фото — нет фото, без надписей-заглушек и без чужих снимков (подиумы и портреты не выдавать за машину).
- Эмблемы — товарные знаки: каждый файл в `public/logos/` с источником и лицензией в данных серии.
- Ключей API нет, бэкенда нет. Запросы к Википедии — через общий клиент (очередь, повтор при 429, кэш); прошедшие сезоны — `immutable`.
- **Серии не импортируют друг друга**: FE не импортирует `series/f1` и `series/wec`; WEC не импортирует `series/fe`. Общее — переносится в `src/api`, `src/lib`, `src/components`, `src/hooks`, `src/data`. Расширь правило в `eslint.config.js`.
- Новые CSS-классы FE — с приставкой `fe-`; стили — отдельный файл `src/styles/16-fe.css`, подключить в `src/styles/index.css`.
- Пиши пользователю по-русски, коротко: сначала что сделано. Перед необратимыми действиями спрашивай.

## 3. Источник данных — английская Википедия (проверено)

| Что                     | Статья / раздел                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Сезон 2014–15 … 2019–20 | `«2014–15 Formula E Championship»`                                                                                                                                                                                    |
| Сезон с 2020–21         | `«2020–21 Formula E World Championship»` (есть и 2026–27)                                                                                                                                                             |
| Календарь               | раздел **Calendar**: Round, E-Prix, Country, Circuit, Date                                                                                                                                                            |
| Победители этапов       | **Results and standings → E-Prix**: Round, E-Prix, Pole position, Fastest lap, Winning driver, Winning team, Winning manufacturer, Report                                                                             |
| Зачёты                  | **Drivers' Championship** (Pos., Driver, колонки этапов, Pts), **Teams' Championship** (Pos., Team, No., две строки на команду), **Manufacturers' Championship**; цвета мест как у WEC (gold/silver/bronze/points/…)  |
| Заявка                  | **Teams and drivers**                                                                                                                                                                                                 |
| Гонка                   | статья `«2026 Monaco ePrix»`: Qualifying (Group draw, группы), **Qualifying duels**, **Race**: Pos., No., Driver, Team, Laps, Time/Retired, Grid, Points. Сдвоенный этап — разделы **Race 1 / Race 2** в одной статье |
| Пилот                   | раздел **Complete Formula E results** + инфобокс и вводный абзац                                                                                                                                                      |
| Команда                 | `«Jaguar TCS Racing»` → редирект `«Jaguar Racing (Formula E)»`, раздел **Complete Formula E results**                                                                                                                 |
| E-Prix по годам         | `«Monaco ePrix»`, раздел **Results**                                                                                                                                                                                  |

Особенности: в зачётах у сдвоенных этапов два столбца под одним заголовком (colspan) — разбирай через `tableGrid`/`wikiTables`, колонки ищи по заголовкам; в ячейках бывают надстрочные пометки (поул, быстрый круг) — сохраняй текст, место бери только как целое число. Сезоны идут через год (`2025-26`), как суперсезоны WEC. Текущий сезон стартует в конце года: если статьи ещё нет — понятное сообщение, не ошибка.

## 4. Что переиспользовать (не копировать)

- `src/lib/wikitable.ts` — разбор таблиц (rowspan/colspan, флаги, ссылки, цвета).
- Из WEC вынести в общий код, оставив WEC-тесты зелёными: клиент Википедии и вспомогательные функции (`createClient`-настройка, `query`, `articleUrl`, `articleMeta`, поиск раздела) из `src/series/wec/api/wikipedia.ts` → `src/api/wikipedia.ts`; разбор зачётов с колонками этапов и цветами (`parseStandings`, `TONES` из `src/series/wec/domain/parse.ts`) → `src/lib/wikiStandings.ts` с параметром для серии; график мест `src/series/wec/components/PlacesChart.tsx` + `domain/places.ts` → `src/components/PlacesChart.tsx` + `src/lib/places.ts`.
- Уже общие: `src/components/{DataState,PageHeader,PhotoFigure,SortableTable,Emblem,FavButton,CircuitMap}.tsx`, `src/hooks/{useResource,useFavorites,useNow}.ts`, `src/api/wikimedia.ts` (`getArticlePhoto`, `infoboxPhotoFiles`), `src/data/circuits` (схемы F1DB).
- Образец страниц и устройства серии — `src/series/wec/` (api, data, domain, hooks, components, pages, contract, `__fixtures__`).

## 5. Этапы

### Этап 0 — основа и тема

- Перенести общие части из WEC (п. 4), WEC без изменений поведения.
- Тема: в `16-fe.css` блок `:root[data-series='fe'] { --accent: #8b3dff; --accent-rgb: 139, 61, 255; --accent-strong: #a66bff; --accent-deep: #5a1fb8; --accent-text: #c4a3ff; }` и токен `--fe-purple` в `01-base.css`.
- `src/components/Layout.tsx`: серия `'fe'` (`/fe…`), переключатель F1 · WEC · FE, меню FE, выбор сезона FE, подвал «Данные: Википедия, CC BY-SA 4.0».
- `src/pages/ChoosePage.tsx`: третья карточка «Formula E» (`series-card--fe`, фиолетовая).
- `src/App.tsx`: маршруты `fe`, `fe/:season/…` через `lazy` из `src/series/fe/pages/index.ts` (отдельный файл сборки).
- `src/series/fe/data/seasons.ts`: id `2014-15` … текущий, `seasonArticle` (Championship до 2019–20, World Championship с 2020–21), `isPastSeason`.
- ESLint: границы серий (п. 2).

### Этап 1 — сезон как в F1

- **Главная** (как F1): ближайший E-Prix с отсчётом, прогресс сезона, последний этап (победитель, поул, быстрый круг; подиум из статьи гонки), лидеры пилотов и команд (топ-5 с полосками), избранное.
- **Календарь**: статусы («Завершён» только при опубликованном победителе), сдвоенные этапы с пометкой, победители.
- **Этап**: протокол гонки (места, номера, команды, круги, время/сход, старт, очки — как у источника), квалификация (группы и дуэли), Race 1 / Race 2 для сдвоенных этапов, блок трассы: описание и схема, только если конфигурация подтверждена (уличные трассы в F1DB есть не все — тогда только описание).
- **Зачёты**: пилоты, команды (две машины — две строки результатов), производители; цвета мест; легенда.
- **График**: места в гонках (общий `PlacesChart`: выделение линии, пунктир через пропуски, строка «сход»). Графика очков **нет**: очков после каждого этапа у источника нет, суммировать нельзя.
- **Источники** `#/fe/:season/about`.

### Этап 2 — участники и профили

- Списки «Пилоты» и «Команды» из Teams and drivers (поиск, флаги, номера).
- Профиль пилота: фото, сведения из инфобокса, краткая биография (без транскрипции), таблица Complete Formula E results, счётчики только из явных данных (сезоны, победы и подиумы — подсчёт строк с местом 1–3, титулы — место 1 в завершённом сезоне).
- Профиль команды: эмблема, результаты из статьи, пилоты сезона, фото машины из статьи команды/модели (не подиум).
- Профиль E-Prix: победители по годам (Results), схема/описание трассы.
- Сравнение двух пилотов (как F1/WEC), выбор в URL.

### Этап 3 — оформление

- Избранное: `createFavorites('racinghub:fe:favorites', ['drivers','teams'], validArticle)`; F1/WEC не трогать.
- Эмблемы команд/производителей FE (Jaguar, Porsche, Nissan, Mahindra, Maserati, DS/Citroën, McLaren, Andretti, Envision, Cupra Kiro, Lola Yamaha ABT и др.) через `Emblem`; уже есть `porsche.png`, `nissan.png`, `mclaren.svg` и др. в `public/logos/`. Для клиентских команд — эмблема по силовой установке, только если она однозначна.
- README (раздел FE, таблица «три чемпионата», скриншоты), `src/series/fe/README.md`, `docs/MAINTENANCE.md`, `docs/TESTING.md`, `docs/HANDOFF.md`.

## 6. Тесты (каждый этап)

- Фикстуры — урезанные **настоящие** статьи в `src/series/fe/__fixtures__/`: сезоны 2014–15, 2019–20, 2025–26 (календарь, результаты, заявка), гонки — одиночная и сдвоенная (`2026 Monaco ePrix`), пилот, команда, E-Prix. Скрипт обновления по образцу `scripts/fetch-wec-profiles.mjs` с User-Agent проекта.
- Unit на разбор (сдвоенные колонки, две строки команды, «Ret/DNS/DSQ/NC», надстрочные пометки, пустые этапы).
- E2E: расширить `mockApi` в `e2e/fixtures.ts` для статей FE; сценарии на каждую страницу, смену сезона, ошибку и повтор, телефон.
- Контракт на живую Википедию: `src/series/fe/contract/` (подключается в `vitest.contract.config.ts`), редко, без частых повторов (429).
- Визуальные маршруты FE в `e2e/visual.spec.ts` (1280 и 375).
- Команды: `npx tsc --noEmit`, `npm run lint`, `npx prettier --check .`, `npm test` (~30 с), `npm run test:e2e`, `npm run test:visual` (`node scripts/test-visual.mjs --update` после осознанной смены вёрстки; `CAPTURE_DOCS=1` — снимки README), `npm run build`, `npm audit --omit=dev`.

## 7. Подводные камни

- Windows: не правь код однострочниками Python/sed с регулярками — теряются `\` и появляются управляющие символы (`\b` → backspace). Используй обычный редактор файлов.
- Не запускай два Playwright-прогона одновременно (общая папка результатов).
- Prettier после правок: `npx prettier --write src e2e docs README.md`.
- Классы CSS разных серий не должны совпадать — только `fe-…`.
- Тесты уже параллельные; флаги `--maxWorkers=2`/`--workers=1` не нужны.
