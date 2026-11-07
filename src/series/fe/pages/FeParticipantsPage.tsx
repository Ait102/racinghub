import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import type { FeParticipant } from '../domain/participants';
import { useFeParticipants } from '../hooks/data';
import { useFeFavorites } from '../hooks/favorites';
import { FeGuard } from './common';

export function FeParticipantsPage({ drivers }: { drivers: boolean }) {
  return (
    <FeGuard>
      {(season) => <Participants key={`${season}:${drivers}`} season={season} drivers={drivers} />}
    </FeGuard>
  );
}

function Participants({ season, drivers }: { season: string; drivers: boolean }) {
  const res = useFeParticipants(season, drivers);
  const [search, setSearch] = useState('');
  const { isFav } = useFeFavorites();
  const title = drivers ? 'Пилоты' : 'Команды';
  const columns: Column<FeParticipant>[] = [
    {
      key: 'name',
      header: drivers ? 'Пилот' : 'Команда',
      render: (row) => <NameFlag who={row.who} kind={drivers ? 'driver' : 'team'} emblem={!drivers} />,
      sortValue: (row) => row.who.name,
    },
    ...(drivers
      ? [
          {
            key: 'numbers',
            header: 'Номер',
            abbr: '№',
            align: 'center' as const,
            render: (row: FeParticipant) => row.numbers.join(', ') || '—',
            sortValue: (row: FeParticipant) => Number(row.numbers[0]) || null,
          },
        ]
      : []),
    {
      key: 'partners',
      header: drivers ? 'Команда' : 'Номер и пилот',
      render: (row) =>
        !drivers ? (
          <span className="fe-partners">
            {row.lineup.map(({ number, driver }) => (
              <span key={JSON.stringify([number, driver?.article ?? driver?.name])}>
                <strong>{number ? `№ ${number}` : '—'}</strong> <NameFlag who={driver} kind="driver" />
              </span>
            ))}
          </span>
        ) : row.partners.length ? (
          <span className="fe-partners">
            {row.partners.map((p) => (
              <NameFlag key={p.article ?? p.name} who={p} kind="team" emblem />
            ))}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'powertrain',
      header: 'Силовая установка',
      optional: true,
      render: (row) => row.powertrains.join(', ') || '—',
    },
  ];
  return (
    <section className="page">
      <PageHeader eyebrow={`Formula E ${seasonLabel(season)}`} title={title}>
        <p className="lead">Заявочный список сезона из Википедии, включая запасных пилотов.</p>
      </PageHeader>
      {drivers && (
        <p>
          <Link to={`/fe/${season}/compare`}>Сравнить пилотов</Link>
        </p>
      )}
      <DataState
        state={res}
        isEmpty={(data) => data.length === 0}
        emptyText="В статье сезона пока нет заявочного списка."
      >
        {(data) => {
          const query = search.trim().toLocaleLowerCase();
          const rows = data.filter(
            (row) =>
              row.who.name.toLocaleLowerCase().includes(query) ||
              row.numbers.some((number) => number.includes(query)) ||
              row.partners.some((p) => p.name.toLocaleLowerCase().includes(query)),
          );
          return (
            <>
              <label className="fe-search">
                Поиск по имени или команде
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              {rows.length ? (
                <SortableTable
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.who.article ?? row.who.name}
                  caption={title}
                  rowClassName={(row) =>
                    row.who.article && isFav(drivers ? 'drivers' : 'teams', row.who.article)
                      ? 'row--fav'
                      : undefined
                  }
                />
              ) : (
                <p>Ничего не найдено.</p>
              )}
            </>
          );
        }}
      </DataState>
      <WikiSourceNote />
    </section>
  );
}
