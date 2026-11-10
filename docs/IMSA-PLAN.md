# IMSA — постановка следующих этапов

Прочитай этот файл, затем `docs/HANDOFF.md`, `README.md`, `docs/MAINTENANCE.md`, `src/series/wec/README.md` и `src/series/fe/README.md`. Первым сообщением коротко скажи, что понял и с какого этапа начнёшь.

## Что уже есть (этап 0)

- `src/series/imsa/data/seasons.ts` — сезоны 2014…текущий год, статья сезона (`seasonArticle`), запоминание сезона; общий модуль `src/lib/yearSeasons.ts`.
- `#/imsa`, `#/imsa/:season` — страница-заготовка (`pages/ImsaSeasonPage.tsx`, общий `src/components/UpcomingSeasonPage.tsx`), выбор сезона в шапке, подвал с источником, зелёно-чёрная тема (`src/styles/11-series.css`), карточка на стартовой странице.
- ESLint: серии не импортируют друг друга (`eslint.config.js`).

## Источник — английская Википедия (проверено 09.11.2026)

| Что       | Где                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Сезон     | 2014–2015: `«2014 United SportsCar Championship»`; с 2016: `«2026 IMSA SportsCar Championship»`      |
| Календарь | раздел **Schedule**                                                                                  |
| Заявка    | **Entries** — подразделы по классам: Grand Touring Prototype (GTP), LMP2, GT Daytona (GTD Pro / GTD) |
| Гонки     | **Race results** (победители по классам), статьи отдельных гонок (Daytona, Sebring, Petit Le Mans…)  |
| Зачёты    | **Championship standings** → Drivers'/Teams'/Manufacturers' Championships, отдельно по классам       |

Классы менялись по годам (Prototype, PC, GTLM, DPi, LMP3 и др.) — классы и названия зачётов брать из самих таблиц, как в WEC.

## Этапы

1. **Сезон:** главная (ближайшая гонка, победители классов последней гонки, лидеры), календарь, страница гонки (протокол по классам), все зачёты с цветами мест, знаки классов.
2. **Участники и профили:** заявки, экипажи (номер, команда, машина, пилоты), профили пилота/команды/трассы из статей, сравнение.
3. **Оформление:** эмблемы марок (общий `src/data/emblems.ts` — Porsche, Cadillac, BMW, Acura, Lamborghini, Ferrari, Corvette, Ford, Lexus, Mercedes, McLaren, Aston Martin…), фото, график мест, README и скриншоты.

## Переиспользовать (не копировать)

`src/api/wikipedia.ts` (клиент, разделы), `src/lib/wikitable.ts`, `src/lib/wikiStandings.ts` (зачёты, цвета), `src/lib/wikiProfile.ts` (карточки, вступление, таблицы), `src/components/PlacesChart.tsx` + `PlacesSection.tsx`, `src/components/Emblem.tsx`, `src/data/emblems.ts`, `src/components/WeekendSchedule.tsx`. Образец устройства серии — `src/series/wec/` (те же классы, экипажи, протоколы).

## Правила

Как в `docs/HANDOFF.md`: ничего не выдумывать, очки и места как у источника, источник и время под каждым блоком, фото только Commons с автором, классы CSS с приставкой `imsa-`, тесты на настоящих урезанных статьях (`__fixtures__`), E2E с подменой Википедии, коммиты и пуш — только пользователь.
