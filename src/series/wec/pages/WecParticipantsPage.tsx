import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { ClassBadge, ClassList, EntryDrivers, NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import type { EntryCrew, Participant } from '../domain/participants';
import { useWecParticipants } from '../hooks/data';
import { useWecFavorites } from '../hooks/favorites';
import { WecGuard } from './common';

export function WecParticipantsPage({ drivers }: { drivers: boolean }) {
  return (
    <WecGuard>
      {(season) => <Participants key={`${season}:${drivers}`} season={season} drivers={drivers} />}
    </WecGuard>
  );
}

export function WecCrewsPage() {
  return <WecGuard>{(season) => <Crews key={season} season={season} />}</WecGuard>;
}

function Crews({ season }: { season: string }) {
  const res = useWecParticipants(season, false);
  const [search, setSearch] = useState('');
  const columns: Column<EntryCrew>[] = [
    {
      key: 'number',
      header: '№',
      render: (r) => <strong>{r.number}</strong>,
      sortValue: (r) => Number(r.number),
    },
    {
      key: 'team',
      header: 'Команда',
      render: (r) => <NameFlag who={r.entrant} />,
      sortValue: (r) => r.entrant.name,
    },
    {
      key: 'category',
      header: 'Класс',
      render: (r) => <ClassBadge cls={r.category} />,
      sortValue: (r) => r.category,
    },
    { key: 'car', header: 'Машина', render: (r) => r.car?.name ?? '—', optional: true },
    { key: 'drivers', header: 'Пилоты', render: (r) => <EntryDrivers crew={r} /> },
  ];
  return (
    <section className="page">
      <PageHeader eyebrow={`WEC ${seasonLabel(season)}`} title="Экипажи">
        <p className="lead">Машины и пилоты по заявке сезона. Состав может меняться от этапа к этапу.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.every((p) => !p.crews.length)}
        emptyText="В заявке сезона нет номеров экипажей."
      >
        {(data) => {
          const query = search.trim().toLocaleLowerCase().replace(/^№\s*/, '');
          const rows = [...new Set(data.flatMap((p) => p.crews))].filter((r) =>
            [r.number, r.entrant.name, r.category, r.car?.name, ...r.drivers.map((d) => d.who.name)].some(
              (value) => value?.toLocaleLowerCase().includes(query),
            ),
          );
          return (
            <>
              <label className="wec-search">
                Поиск по номеру, команде или пилоту
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              {rows.length ? (
                <SortableTable
                  columns={columns}
                  rows={rows}
                  rowKey={(r) =>
                    JSON.stringify([r.entrant.name, r.entrant.article, r.category, r.number, r.car?.name])
                  }
                  caption="Экипажи WEC"
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

function Participants({ season, drivers }: { season: string; drivers: boolean }) {
  const res = useWecParticipants(season, drivers);
  const [search, setSearch] = useState('');
  const { isFav } = useWecFavorites();
  const title = drivers ? 'Пилоты' : 'Команды';
  const columns: Column<Participant>[] = [
    {
      key: 'numbers',
      header: 'Номера экипажей',
      abbr: '№',
      render: (row) => [...new Set(row.crews.map((crew) => `№ ${crew.number}`))].join(', ') || '—',
    },
    {
      key: 'name',
      header: drivers ? 'Пилот' : 'Команда',
      render: (row) => <NameFlag who={row.who} kind={drivers ? 'driver' : 'team'} emblem={!drivers} />,
      sortValue: (row) => row.who.name,
    },
    {
      key: 'category',
      header: 'Классы и зачёты',
      render: (row) => <ClassList classes={row.categories} />,
      sortValue: (row) => row.categories.join(' '),
    },
  ];
  return (
    <section className="page">
      <PageHeader eyebrow={`WEC ${seasonLabel(season)}`} title={title}>
        <p className="lead">Заявочный список сезона из Википедии, включая приглашённых и запасных пилотов.</p>
      </PageHeader>
      {drivers && (
        <p>
          <Link to={`/wec/${season}/compare`}>Сравнить пилотов</Link>
        </p>
      )}
      <DataState
        state={res}
        isEmpty={(data) => data.length === 0}
        emptyText="В статье сезона нет заявочного списка."
      >
        {(data) => {
          const query = search.trim().toLocaleLowerCase().replace(/^№\s*/, '');
          const rows = data.filter(
            (row) =>
              row.who.name.toLocaleLowerCase().includes(query) ||
              row.crews.some((crew) => crew.number.includes(query)),
          );
          return (
            <>
              <label className="wec-search">
                Поиск по имени или номеру
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
