import { articleUrl } from '../../../api/wikipedia';
import { Emblem } from '../../../components/Emblem';
import { PageHeader } from '../../../components/PageHeader';
import { emblemSources } from '../../../data/emblems';
import { seasonArticle, seasonLabel } from '../data/seasons';
import { FeGuard } from './common';

/** Makes that have run Formula E powertrains or teams. */
const FE_MAKES = [
  'Audi',
  'BMW',
  'Citroën',
  'DS',
  'Jaguar',
  'Lola',
  'Mahindra',
  'Maserati',
  'McLaren',
  'Mercedes',
  'NIO',
  'Nissan',
  'Porsche',
  'Renault',
];

export function FeSourcesPage() {
  return (
    <FeGuard>
      {(season) => (
        <section className="page prose">
          <PageHeader eyebrow={`Formula E ${seasonLabel(season)} · О проекте`} title="Источники данных" />
          <h2>Календарь, результаты и зачёты</h2>
          <p>
            Источник — английская Википедия:{' '}
            <a href={articleUrl(seasonArticle(season))} target="_blank" rel="noreferrer">
              {seasonArticle(season)}
            </a>
            . Календарь, победители, поул, быстрый круг и зачёты читаются из статьи сезона; протоколы гонок и
            квалификация — из статей E-Prix. Под данными находятся ссылки на конкретную статью и время
            загрузки. Подиум главной страницы имеет собственный источник — статью гонки.
          </p>
          <p>
            Текст и данные Википедии доступны по лицензии{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              CC BY-SA 4.0
            </a>
            . Статьи редактирует сообщество: результаты могут появляться через несколько часов или на
            следующий день. Для проверки доступны{' '}
            <a href="https://www.fiaformulae.com/" target="_blank" rel="noreferrer">
              сайт Formula E
            </a>{' '}
            и{' '}
            <a href="https://www.fia.com/" target="_blank" rel="noreferrer">
              FIA
            </a>
            .
          </p>
          <h2>Как читать данные</h2>
          <ul>
            <li>
              Места и очки показаны как у источника. Очки машин, команд и производителей не складываются.
            </li>
            <li>
              Каждая машина в командном зачёте сохраняет свою строку результатов. Общие место и очки команды
              берутся из опубликованной таблицы.
            </li>
            <li>
              График показывает места в отдельных гонках, а не положение в чемпионате. Графика вычисленных
              очков нет. Пропуски соединены пунктиром, сходы и дисквалификации отмечены крестиком.
            </li>
            <li>
              «—» означает, что у источника нет значения; пустая клетка зачёта показана точкой. Пометки при
              результатах сохранены как у источника.
            </li>
            <li>
              «Завершён» означает, что опубликован победитель. «Идёт» — наступила дата этапа, «Ждём
              результаты» — дата прошла, победителя ещё нет. Отсчёт ведётся до даты, без выдуманного времени
              старта.
            </li>
            <li>Сдвоенные этапы имеют два отдельных протокола Race 1 и Race 2 из одной статьи.</li>
            <li>
              Если статья будущего сезона ещё не создана, сайт сообщает об отсутствии данных. Неизвестные
              значения не достраиваются.
            </li>
            <li>
              Данные кэшируются в браузере. «Обновить» запрашивает источник заново; при сбое может
              показываться последняя сохранённая копия с пометкой.
            </li>
          </ul>
          <h2>Схемы трасс</h2>
          <p>
            Общие контуры трасс — из{' '}
            <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">
              F1DB
            </a>
            ,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Схема показывается только при подтверждённом совпадении конфигурации Formula E выбранного года.
            Похожая трасса Formula 1 не подставляется. Описание трассы и его источник доступны и без схемы.
          </p>
          <h2>Профили и фото</h2>
          <p>
            Профили пилотов, команд и E-Prix читаются из их статей: цифры карьеры (старты, победы, подиумы,
            поулы, титулы) — из карточки статьи, как их публикует Википедия, без пересчёта. Фото — только
            свободные файлы Wikimedia Commons с автором и лицензией. Фото машины команды показывается, только
            если в подписи снимка указана модель этого сезона; иначе фото нет.
          </p>
          <h2>Эмблемы производителей</h2>
          <p>
            Эмблема стоит у команды, если её название начинается с марки, иначе — по марке силовой установки
            из заявки сезона (Andretti — Porsche, Envision — Jaguar). Это товарные знаки владельцев; ссылка на
            исходный файл, его статус и правообладатель — ниже.
          </p>
          <ul className="fe-source-emblems">
            {emblemSources
              .filter((entry) => FE_MAKES.includes(entry.name))
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
          <h2>Избранное</h2>
          <p>
            Пилоты и команды сохраняются только в браузере, отдельно от Formula 1 и WEC. Добавить участника
            можно в зачётах или в его профиле; опубликованные место и очки появятся на главной сезона.
          </p>
          <h2>Неофициальный проект</h2>
          <p>
            Racing Hub — личный некоммерческий фанатский проект без рекламы и доходов. Он не связан с FIA,
            Formula E, Formula 1, WEC, организаторами и командами и не одобрен ими. Названия и товарные знаки
            принадлежат владельцам.
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
    </FeGuard>
  );
}
