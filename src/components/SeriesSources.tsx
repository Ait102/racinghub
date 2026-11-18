// Sources page of a Wikipedia-based series (IMSA, DTM): where every block comes from, and the
// make emblems with their source, status and owner.
import type { ReactNode } from 'react';

import { emblemSources } from '../data/emblems';
import { Emblem } from './Emblem';
import { PageHeader } from './PageHeader';

export function SeriesSources({
  name,
  season,
  article,
  points,
  makes,
}: {
  name: string;
  season: string;
  /** Wikipedia article of the season. */
  article: string;
  /** Where the points after each round come from, or why there are none. */
  points: ReactNode;
  /** Emblem names as `emblemSources` lists them. */
  makes: string[];
}) {
  return (
    <section className="page prose">
      <PageHeader eyebrow={`${name} ${season}`} title="Источники" />
      <h2>Сезон, гонки и зачёты</h2>
      <p>
        Календарь, победители, протоколы, заявки и зачёты — из английской Википедии (статья{' '}
        <a
          href={`https://en.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, '_'))}`}
          target="_blank"
          rel="noreferrer"
        >
          «{article}»
        </a>{' '}
        и статьи гонок), лицензия{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        . Места, очки, статусы и пометки — как в таблицах источника, без пересчёта. Время загрузки указано под
        каждым блоком.
      </p>
      <h2>Очки после каждого этапа</h2>
      {points}
      <h2>Профили и фото</h2>
      <p>
        Профили пилотов, команд и трасс читаются из их статей: цифры (старты, победы, подиумы, поулы, титулы)
        — из карточки статьи и только по этой серии, итоги сезонов — из таблицы результатов. Фото — только
        свободные файлы Wikimedia Commons с автором и лицензией; фото машины команды — только если в подписи
        указана модель из заявки сезона.
      </p>
      <h2>Эмблемы производителей</h2>
      <p>
        Эмблема стоит у марки и у команды, если её название начинается с марки или все её машины одной марки.
        Это товарные знаки владельцев; ссылка на исходный файл, его статус и правообладатель — ниже.
      </p>
      <ul className="wiki-source-emblems">
        {emblemSources
          .filter((entry) => makes.includes(entry.name))
          .map((entry) => (
            <li key={entry.name}>
              <Emblem entry={entry} color={entry.color} />
              <div>
                <a href={entry.source} target="_blank" rel="noreferrer">
                  {entry.name}
                </a>
                <span className="muted small">
                  {' '}
                  · {entry.license} · © {entry.holder}
                </span>
              </div>
            </li>
          ))}
      </ul>
      <h2>Неофициальный проект</h2>
      <p>
        Racing Hub — личный некоммерческий фанатский проект без рекламы и доходов. Он не связан с {name},
        организаторами и командами и не одобрен ими. Названия и товарные знаки принадлежат владельцам.
        Правообладатель может{' '}
        <a href="https://github.com/Ait102/racinghub/issues" target="_blank" rel="noreferrer">
          сообщить об использовании материала
        </a>{' '}
        — материал будет удалён.
      </p>
    </section>
  );
}
