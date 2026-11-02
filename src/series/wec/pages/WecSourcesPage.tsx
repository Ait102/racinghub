import { Emblem } from '../../../components/Emblem';
import { PageHeader } from '../../../components/PageHeader';
import { emblemSources } from '../../../data/emblems';
import { seasonLabel } from '../data/seasons';
import { WecGuard } from './common';

export function WecSourcesPage() {
  return (
    <WecGuard>
      {(season) => (
        <section className="page prose">
          <PageHeader eyebrow={`WEC ${seasonLabel(season)} · О проекте`} title="Источники данных" />
          <h2>Календарь, результаты и профили</h2>
          <p>
            Источник —{' '}
            <a
              href="https://en.wikipedia.org/wiki/FIA_World_Endurance_Championship"
              target="_blank"
              rel="noreferrer"
            >
              английская Википедия
            </a>
            . Календарь, заявки и зачёты читаются из статьи сезона, протоколы — из статьи гонки, сведения о
            пилотах и командах — из их статей. Под блоками находятся ссылки на конкретные статьи и время
            загрузки.
          </p>
          <p>
            Текст и данные распространяются по лицензии{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              CC BY-SA 4.0
            </a>
            . Статьи редактирует сообщество; результаты могут появляться через несколько часов или на
            следующий день. Для проверки доступны{' '}
            <a href="https://www.fiawec.com/" target="_blank" rel="noreferrer">
              сайт FIA WEC
            </a>{' '}
            и{' '}
            <a
              href="https://www.fia.com/events/world-endurance-championship"
              target="_blank"
              rel="noreferrer"
            >
              FIA
            </a>
            .
          </p>
          <h2>Как читать данные</h2>
          <ul>
            <li>Очки и места показаны как у источника. Очки разных машин и классов не складываются.</li>
            <li>
              График показывает места в отдельных гонках, а не положение в чемпионате. Сходы, дисквалификации
              и пропуски разрывают линию.
            </li>
            <li>
              «—» означает, что у источника нет значения. История ограничена опубликованными таблицами статьи.
            </li>
            <li>
              Титулы считаются только для завершённых сезонов. Победы и подиумы в классе Ле-Мана берутся из
              явной колонки Class Pos.; общие места WEC не выдаются за места в классе.
            </li>
            <li>
              «Завершён» означает, что опубликованы победители; «Идёт» — наступили даты этапа; «Ждём
              результаты» — даты прошли, протокола ещё нет. Если время старта не опубликовано, отсчёт
              показывает только дни.
            </li>
            <li>
              Данные текущего сезона и профилей кэшируются на 10 минут; завершённых сезонов — дольше.
              «Обновить» запрашивает источник заново. При сбое может показываться последняя сохранённая копия
              с пометкой.
            </li>
          </ul>
          <h2>Фото и схемы трасс</h2>
          <p>
            Фото — только из{' '}
            <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">
              Wikimedia Commons
            </a>
            , со свободной лицензией. Автор, лицензия и ссылка на исходный файл находятся под изображением.
            Фото модели может показывать машину другой команды или года — подпись уточняет это. Если
            подтверждённого фото нет, случайное изображение не подставляется.
          </p>
          <p>
            Контуры общих с F1 трасс —{' '}
            <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">
              F1DB
            </a>
            , CC BY 4.0. Контуры Ле-Мана и Себринга — ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
            , через{' '}
            <a href="https://github.com/tobi/track-atlas" target="_blank" rel="noreferrer">
              track-atlas
            </a>
            , лицензия{' '}
            <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">
              ODbL 1.0
            </a>
            . У схем WEC указаны собственные источники и конфигурация. Неизвестная конфигурация выбранного
            года не заменяется современной.
          </p>
          <h2>Эмблемы производителей</h2>
          <p>
            Эмблемы служат для обозначения производителей. Это товарные знаки владельцев; ссылка на исходный
            файл, его статус и правообладатель приведены ниже. Знаки классов «HYPER CAR» и «LM GT3» —
            текстовые обозначения Racing Hub.
          </p>
          <ul className="wec-source-emblems">
            {emblemSources.map((entry) => (
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
            Racing Hub — личный некоммерческий фанатский проект, без рекламы и доходов. Он не связан с FIA,
            WEC, Formula 1, организаторами гонок и командами и не одобрен ими. Названия и товарные знаки
            принадлежат их владельцам.
          </p>
          <p>
            Правообладатель может{' '}
            <a href="https://github.com/Ait102/racinghub/issues" target="_blank" rel="noreferrer">
              сообщить об использовании материала
            </a>{' '}
            — материал будет удалён.
          </p>
        </section>
      )}
    </WecGuard>
  );
}
