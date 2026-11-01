import { Link, useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import type { StandingKind, StandingTable, WecRound } from '../domain/types';
import { useWecSeason } from '../hooks/data';
import { WecGuard } from './common';

const KIND_LABELS: Record<StandingKind, string> = {
  drivers: 'Пилоты',
  manufacturers: 'Производители',
  teams: 'Команды',
};

export function WecStandingsPage() {
  return <WecGuard>{(season) => <Standings season={season} />}</WecGuard>;
}

function Standings({ season }: { season: string }) {
  const res = useWecSeason(season);
  const [params, setParams] = useSearchParams();
  return (
    <section className="page">
      <PageHeader eyebrow={`WEC ${seasonLabel(season)}`} title="Зачёты">
        <p className="lead">Места и очки — как у источника, без пересчёта.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(d) => d.standings.length === 0}
        emptyText="Зачётов у источника пока нет."
      >
        {(data) => {
          const current = data.standings.find((t) => t.id === params.get('t')) ?? data.standings[0];
          const kinds = (['drivers', 'manufacturers', 'teams'] as StandingKind[]).filter((k) =>
            data.standings.some((t) => t.kind === k),
          );
          return (
            <>
              <div className="standings-picker">
                {kinds.map((k) => (
                  <div key={k} className="standings-picker__group">
                    <span className="standings-picker__label">{KIND_LABELS[k]}</span>
                    <div className="chips" role="group" aria-label={KIND_LABELS[k]}>
                      {data.standings
                        .filter((t) => t.kind === k)
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="chip"
                            aria-pressed={t.id === current.id}
                            onClick={() => setParams({ t: t.id }, { replace: true })}
                          >
                            {t.title}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <StandingsTable table={current} season={season} rounds={data.rounds} />
              <Legend />
              <WikiSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

function StandingsTable({
  table,
  season,
  rounds,
}: {
  table: StandingTable;
  season: string;
  rounds: WecRound[];
}) {
  const roundOf = (report: string | null) => rounds.find((r) => r.report && r.report === report)?.round;
  return (
    <>
      <h2 className="section-title">{table.title}</h2>
      <div className="table-wrap">
        <table className="table wec-standings">
          <caption className="visually-hidden">{table.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="align-center">
                Поз.
              </th>
              <th scope="col">
                {table.kind === 'drivers'
                  ? 'Пилот'
                  : table.kind === 'manufacturers'
                    ? 'Производитель'
                    : 'Команда'}
              </th>
              {table.extraHeader && (
                <th scope="col" className="col-optional">
                  {table.extraHeader === 'Team' ? 'Команда' : table.extraHeader}
                </th>
              )}
              {table.rounds.map((r, i) => {
                const n = roundOf(r.report);
                return (
                  <th key={`${r.abbr}-${i}`} scope="col" className="align-center wec-standings__round">
                    {n ? (
                      <Link to={`/wec/${season}/race/${n}`} title={r.report ?? undefined}>
                        {r.abbr}
                      </Link>
                    ) : (
                      r.abbr
                    )}
                  </th>
                );
              })}
              <th scope="col" className="align-right">
                Очки
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr
                key={`${row.name.name}-${i}`}
                className={row.pos !== null && row.pos <= 3 ? `row--p${row.pos}` : undefined}
              >
                <td className="align-center">
                  <strong>{row.posText}</strong>
                </td>
                <td>
                  <NameFlag who={row.name} kind={table.kind === 'drivers' ? 'driver' : 'team'} />
                </td>
                {table.extraHeader && <td className="col-optional muted">{row.extra ?? '—'}</td>}
                {table.rounds.map((_, j) => (
                  <td key={j} className="align-center wec-standings__cell">
                    {row.lines.map((line, k) => {
                      const c = line[j];
                      return (
                        <span key={k} className={`res${c?.tone ? ` res--${c.tone}` : ''}`}>
                          {c?.text || '·'}
                        </span>
                      );
                    })}
                  </td>
                ))}
                <td className="align-right">
                  <strong>{row.points || '—'}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ['gold', 'Победа'],
    ['silver', '2-е место'],
    ['bronze', '3-е место'],
    ['points', 'В очках'],
    ['nopoints', 'Финиш без очков'],
    ['retired', 'Сход'],
    ['excluded', 'Дисквалификация'],
  ];
  return (
    <p className="wec-legend small">
      {items.map(([tone, label]) => (
        <span key={tone} className="wec-legend__item">
          <span className={`res res--${tone}`} aria-hidden="true">
            ·
          </span>
          {label}
        </span>
      ))}
    </p>
  );
}
