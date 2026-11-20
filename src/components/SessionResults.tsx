// Results of every session of a race weekend (practice, qualifying, races), one at a time.
// Values are the timing's own text; a column appears only when the source fills it.
import { useState, type ReactNode } from 'react';

import { ScheduleMoment } from './WeekendSchedule';

export interface SessionRow {
  pos: number | null;
  posText?: string;
  cls?: string;
  /** Position in class, when the source gives it. */
  pic?: string;
  number: string;
  drivers: string[];
  team: string;
  car: string;
  time: string;
  gap: string;
  laps: number | string | null;
  bestLap: string;
  points?: string | null;
}

export interface SessionData {
  key: string;
  label: string;
  start: string | null;
  rows: SessionRow[];
}

export function SessionResults({
  sessions,
  initial,
  classTag,
  source,
}: {
  sessions: SessionData[];
  /** Session shown first (e.g. the race of this page). */
  initial?: string;
  classTag?: (cls: string) => ReactNode;
  source: ReactNode;
}) {
  const [picked, setPicked] = useState(initial ?? sessions.at(-1)?.key);
  const current = sessions.find((s) => s.key === picked) ?? sessions.at(-1);
  if (!current) return null;
  const has = (f: (r: SessionRow) => unknown) => current.rows.some((r) => !!f(r));
  return (
    <section className="session-results" aria-labelledby="session-results-title">
      <h2 className="section-title" id="session-results-title">
        Результаты сессий
      </h2>
      <div className="chips" role="group" aria-label="Сессия">
        {sessions.map((s) => (
          <button
            key={s.key}
            type="button"
            className="chip"
            aria-pressed={current.key === s.key}
            onClick={() => setPicked(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {current.start && current.start.length > 10 && (
        <p className="muted small">
          Старт: <ScheduleMoment start={current.start} />
        </p>
      )}
      {current.rows.length === 0 ? (
        <p className="muted">У источника пока нет результатов этой сессии.</p>
      ) : (
        <div className="table-wrap">
          <table className="table session-results__table">
            <caption className="visually-hidden">{current.label}</caption>
            <thead>
              <tr>
                <th scope="col" className="align-center">
                  Поз.
                </th>
                {has((r) => r.cls) && <th scope="col">Класс</th>}
                {has((r) => r.pic) && (
                  <th scope="col" className="align-center" title="Место в классе">
                    В классе
                  </th>
                )}
                <th scope="col" className="align-center">
                  №
                </th>
                <th scope="col">Пилоты</th>
                <th scope="col">Команда и машина</th>
                {has((r) => r.bestLap) && (
                  <th scope="col" className="align-right">
                    Лучший круг
                  </th>
                )}
                {has((r) => r.time && r.time !== r.bestLap) && (
                  <th scope="col" className="align-right">
                    Время
                  </th>
                )}
                {has((r) => r.gap && r.gap !== '-') && (
                  <th scope="col" className="align-right">
                    Отставание
                  </th>
                )}
                {has((r) => r.laps !== null && r.laps !== '') && (
                  <th scope="col" className="align-right">
                    Круги
                  </th>
                )}
                {has((r) => r.points) && (
                  <th scope="col" className="align-right">
                    Очки
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {current.rows.map((r, i) => (
                <tr key={`${r.number}-${i}`}>
                  <td className="align-center">
                    <strong>{r.posText ?? r.pos ?? '—'}</strong>
                  </td>
                  {has((x) => x.cls) && <td>{r.cls ? (classTag ? classTag(r.cls) : r.cls) : '—'}</td>}
                  {has((x) => x.pic) && <td className="align-center">{r.pic || '—'}</td>}
                  <td className="align-center">{r.number || '—'}</td>
                  <td>
                    <span className="wiki-list">
                      {r.drivers.map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </span>
                  </td>
                  <td>
                    {r.team || '—'}
                    {r.car && <span className="muted small wiki-block">{r.car}</span>}
                  </td>
                  {has((x) => x.bestLap) && <td className="align-right">{r.bestLap || '—'}</td>}
                  {has((x) => x.time && x.time !== x.bestLap) && (
                    <td className="align-right">{r.time && r.time !== r.bestLap ? r.time : '—'}</td>
                  )}
                  {has((x) => x.gap && x.gap !== '-') && <td className="align-right">{r.gap || '—'}</td>}
                  {has((x) => x.laps !== null && x.laps !== '') && (
                    <td className="align-right">{r.laps ?? '—'}</td>
                  )}
                  {has((x) => x.points) && <td className="align-right">{r.points || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">{source}</p>
    </section>
  );
}
