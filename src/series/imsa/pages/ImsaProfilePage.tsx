import { Link, useParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SeriesCircuitMap } from '../../../components/SeriesCircuitMap';
import { SeriesProfilePhoto, SeriesProfileView, SeriesTeamCars } from '../../../components/SeriesProfileView';
import { validArticle } from '../../../lib/wikiArticle';
import type { SeriesProfileKind } from '../../../lib/wikiProfile';
import { useImsaParticipants, useImsaProfile, useImsaSeason } from '../hooks/data';
import { ImsaGuard, ImsaName, ImsaSourceNote } from './common';

const KIND_LABEL: Record<SeriesProfileKind, string> = { driver: 'Пилот', team: 'Команда', circuit: 'Трасса' };
const BACK: Record<SeriesProfileKind, [string, string]> = {
  driver: ['drivers', 'Пилоты'],
  team: ['teams', 'Команды'],
  circuit: ['calendar', 'Календарь'],
};

export function ImsaProfilePage({ kind }: { kind: SeriesProfileKind }) {
  const { article = '' } = useParams();
  return (
    <ImsaGuard>
      {(season) =>
        validArticle(article) ? (
          <Profile key={`${kind}:${article}`} season={season} article={article} kind={kind} />
        ) : (
          <section className="page">
            <h1>Недопустимый адрес профиля</h1>
            <Link to={`/imsa/${season}`}>IMSA</Link>
          </section>
        )
      }
    </ImsaGuard>
  );
}

function Profile({ season, article, kind }: { season: string; article: string; kind: SeriesProfileKind }) {
  const res = useImsaProfile(article, kind);
  const canonical = res.status === 'success' ? res.data.article : article;
  const [back, backLabel] = BACK[kind];
  if (res.status === 'error' && res.error instanceof Error && res.error.message === 'Статья не найдена') {
    return (
      <section className="page">
        <h1>Профиль не найден</h1>
        <p role="alert">Статья не найдена в Википедии.</p>
        <Link to={`/imsa/${season}`}>IMSA</Link>
      </section>
    );
  }
  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/imsa/${season}/${back}`}>
          ← {backLabel} {season}
        </Link>
      </nav>
      <PageHeader
        eyebrow={`IMSA ${season} · ${KIND_LABEL[kind]}`}
        title={canonical.replace(/_/g, ' ')}
        aside={
          res.status === 'success' && kind !== 'team' ? (
            <SeriesProfilePhoto article={canonical} kind={kind} />
          ) : null
        }
      >
        {kind === 'driver' && (
          <div className="profile-actions">
            <Link
              className="btn btn--ghost btn--small"
              to={`/imsa/${season}/compare?${new URLSearchParams({ a: canonical })}`}
            >
              Сравнить с другим пилотом
            </Link>
          </div>
        )}
      </PageHeader>
      {kind === 'circuit' && (
        <SeriesCircuitMap names={[article, canonical]} title={canonical.replace(/_/g, ' ')} />
      )}
      {kind !== 'circuit' && <SeasonStanding season={season} articles={[article, canonical]} kind={kind} />}
      {kind === 'team' && res.status === 'success' && (
        <TeamCars season={season} articles={[article, canonical]} />
      )}
      <DataState state={res}>
        {(profile) => (
          <SeriesProfileView
            profile={profile}
            season={season}
            seriesName="IMSA"
            renderName={(who, header) =>
              /^(Team|Entrant)$/i.test(header) ? (
                <ImsaName who={{ ...who, flag: null }} kind="team" />
              ) : /^Drivers?$/i.test(header) ? (
                <ImsaName who={{ ...who, flag: null }} kind="driver" />
              ) : null
            }
          />
        )}
      </DataState>
      <ImsaSourceNote />
    </section>
  );
}

/** Place and points in this season's published standings. */
function SeasonStanding({
  season,
  articles,
  kind,
}: {
  season: string;
  articles: string[];
  kind: 'driver' | 'team';
}) {
  const res = useImsaSeason(season);
  if (res.status !== 'success') return null;
  const rows = res.data.standings.flatMap((table) =>
    table.kind !== (kind === 'driver' ? 'drivers' : 'teams')
      ? []
      : table.rows
          .filter((row) =>
            (row.crew ?? [row.name]).some((who) => who.article && articles.includes(who.article)),
          )
          .map((row) => ({ row, table })),
  );
  return (
    <div className="wiki-profile-season">
      <h2 className="section-title">Сезон {season}</h2>
      {rows.length ? (
        <ul className="wiki-season-list">
          {rows.map(({ row, table }) => (
            <li key={table.id}>
              <Link to={`/imsa/${season}/standings?t=${table.id}`}>{table.title}</Link>:{' '}
              <strong>{row.posText || '—'}</strong> место, {row.points || '—'} очк.
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">В опубликованных зачётах этого сезона не найден.</p>
      )}
    </div>
  );
}

/** Models the team entered this season, from the entry list. */
function TeamCars({ season, articles }: { season: string; articles: string[] }) {
  const entries = useImsaParticipants(season);
  if (entries.status !== 'success') return null;
  const cars = new Map<string, string | null>();
  for (const crew of entries.data)
    if (crew.team?.article && articles.includes(crew.team.article) && crew.car && !cars.has(crew.car))
      cars.set(crew.car, crew.carArticle);
  return <SeriesTeamCars season={season} cars={[...cars].map(([model, article]) => ({ model, article }))} />;
}
