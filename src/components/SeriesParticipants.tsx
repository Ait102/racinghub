// Entry list of a season (IMSA, DTM): drivers with their cars, or teams with their crews.
import { useState, type ReactNode } from 'react';

import { entryDrivers, type Crew, type EntryDriver } from '../lib/wikiEntries';
import type { Named } from '../lib/wikiStandings';
import { SortableTable, type Column } from './SortableTable';

/** A linked name; for a team, `cars` are its models (for the make emblem of customer teams). */
type Link = (who: Named, kind: 'driver' | 'team', cars?: string[]) => ReactNode;

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function SeriesParticipants({
  crews,
  drivers,
  name,
  classTag,
}: {
  crews: Crew[];
  drivers: boolean;
  name: Link;
  /** Class mark for multi-class series; omitted when the series has one class. */
  classTag?: (cls: string) => ReactNode;
}) {
  const [search, setSearch] = useState('');
  const query = fold(search.trim());
  const hasClass = !!classTag && crews.some((c) => c.cls);
  const hasStatus = crews.some((c) => c.drivers.some((d) => d.status));
  const match = (...texts: Array<string | null | undefined>) =>
    texts.some((t) => t && fold(t).includes(query));

  const driverRows = entryDrivers(crews).filter(
    (d) =>
      !query || match(d.driver.name, ...d.seats.flatMap((s) => [s.number, s.team?.name, s.car, s.cls ?? ''])),
  );
  const crewRows = crews.filter(
    (c) => !query || match(c.team?.name, c.number, c.car, c.cls, ...c.drivers.map((d) => d.driver.name)),
  );

  const driverColumns: Column<EntryDriver>[] = [
    {
      key: 'name',
      header: 'Пилот',
      render: (row) => name(row.driver, 'driver'),
      sortValue: (row) => row.driver.name,
    },
    {
      key: 'number',
      header: 'Номер',
      abbr: '№',
      align: 'center',
      render: (row) => row.seats.map((s) => s.number).join(', ') || '—',
      sortValue: (row) => Number(row.seats[0]?.number) || null,
    },
    ...(hasClass
      ? [
          {
            key: 'cls',
            header: 'Класс',
            render: (row: EntryDriver) => (
              <span className="wiki-tags">
                {[...new Set(row.seats.map((s) => s.cls ?? ''))].map((c) => c && classTag!(c))}
              </span>
            ),
            sortValue: (row: EntryDriver) => row.seats[0]?.cls ?? '',
          },
        ]
      : []),
    {
      key: 'team',
      header: 'Команда',
      render: (row) => (
        <span className="wiki-list">
          {row.seats.map((s, i) => (
            <span key={i}>{s.team ? name(s.team, 'team', [s.car]) : '—'}</span>
          ))}
        </span>
      ),
    },
    {
      key: 'car',
      header: 'Машина',
      optional: true,
      render: (row) => [...new Set(row.seats.map((s) => s.car).filter(Boolean))].join(', ') || '—',
    },
    {
      key: 'rounds',
      header: 'Этапы',
      optional: true,
      render: (row) => (
        <span className="wiki-list">
          {row.seats.map((s, i) => (
            <span key={i}>
              {s.rounds || '—'}
              {s.status && <span className="muted small"> · {s.status}</span>}
            </span>
          ))}
        </span>
      ),
    },
  ];

  const crewColumns: Column<Crew>[] = [
    {
      key: 'team',
      header: 'Команда',
      render: (row) => (row.team ? name(row.team, 'team', [row.car]) : '—'),
      sortValue: (row) => row.team?.name ?? '',
    },
    {
      key: 'number',
      header: 'Номер',
      abbr: '№',
      align: 'center',
      render: (row) => row.number || '—',
      sortValue: (row) => Number(row.number) || null,
    },
    ...(hasClass
      ? [
          {
            key: 'cls',
            header: 'Класс',
            render: (row: Crew) => (row.cls ? classTag!(row.cls) : '—'),
            sortValue: (row: Crew) => row.cls ?? '',
          },
        ]
      : []),
    {
      key: 'car',
      header: 'Машина',
      render: (row) => (
        <>
          {row.car || '—'}
          {row.engine && <span className="muted small wiki-block">{row.engine}</span>}
        </>
      ),
    },
    {
      key: 'drivers',
      header: hasStatus ? 'Пилоты, этапы и отметки' : 'Пилоты и этапы',
      render: (row) => (
        <span className="wiki-list">
          {row.drivers.map((d) => (
            <span key={d.driver.name}>
              {name(d.driver, 'driver')}{' '}
              <span className="muted small">
                {d.rounds || ''}
                {d.status ? ` · ${d.status}` : ''}
              </span>
            </span>
          ))}
        </span>
      ),
    },
  ];

  return (
    <>
      <label className="wiki-search">
        {drivers ? 'Поиск по имени, номеру или команде' : 'Поиск по команде, номеру или пилоту'}
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {drivers ? (
        driverRows.length ? (
          <SortableTable
            columns={driverColumns}
            rows={driverRows}
            rowKey={(row) => row.driver.article ?? row.driver.name}
            caption="Пилоты"
          />
        ) : (
          <p>Ничего не найдено.</p>
        )
      ) : crewRows.length ? (
        <SortableTable
          columns={crewColumns}
          rows={crewRows}
          rowKey={(row) => `${row.cls}|${row.team?.name}|${row.number}`}
          caption="Команды и экипажи"
        />
      ) : (
        <p>Ничего не найдено.</p>
      )}
    </>
  );
}
