import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { feSeasonFromPath, rememberFeSeason, seasonArticle, seasonLabel } from '../data/seasons';

const TITLES: Record<string, string> = {
  calendar: 'Календарь',
  standings: 'Зачёты',
  drivers: 'Пилоты',
  teams: 'Команды',
  compare: 'Сравнение',
  about: 'Источники',
};

export function FePage() {
  const { pathname } = useLocation();
  const season = feSeasonFromPath(pathname);
  const section = pathname.split('/')[3] ?? '';
  const title = TITLES[section] ?? 'Formula E';
  useEffect(() => {
    document.title = `${title} · Formula E · Racing Hub`;
    if (season) rememberFeSeason(season);
  }, [season, title]);
  if (!season)
    return (
      <section className="page">
        <h1>Сезон не найден</h1>
        <p>
          <Link to="/fe">Открыть Formula E</Link>
        </p>
      </section>
    );
  const source = `https://en.wikipedia.org/wiki/${encodeURIComponent(seasonArticle(season).replace(/ /g, '_'))}`;
  return (
    <section className="page fe-page">
      <header className="page-header">
        <p className="eyebrow">Formula E · {seasonLabel(season)}</p>
        <h1>{title}</h1>
        <p className="lead">Раздел в разработке: готова основа и выбор сезона.</p>
      </header>
      <div className="card fe-stage">
        <h2>{section === 'about' ? 'Данные и ограничения' : 'Этап 0 — основа раздела'}</h2>
        <p>Календарь, результаты и зачёты пока не загружаются. Данные гонок появятся на следующем этапе.</p>
        <p>
          Источник будущих данных — английская Википедия. Очки и места будут показаны как у источника, без
          пересчёта.
        </p>
        <p>
          <a href={source} target="_blank" rel="noreferrer">
            Статья сезона: {seasonArticle(season)}
          </a>
          . Если статья ещё не создана, данные сезона пока недоступны.
        </p>
        {section === 'about' ? (
          <p>
            Текст и данные Википедии доступны по лицензии{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru" target="_blank" rel="noreferrer">
              CC BY-SA 4.0
            </a>
            . Сайт — неофициальный некоммерческий проект.
          </p>
        ) : (
          <Link to={`/fe/${season}/about`}>Источники и ограничения →</Link>
        )}
      </div>
    </section>
  );
}
