import { useState } from 'react';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import type { Participant } from '../domain/participants';
import { useWecParticipants } from '../hooks/data';
import { WecGuard } from './common';

export function WecParticipantsPage({ drivers }: { drivers: boolean }) {
  return (
    <WecGuard>
      {(season) => <Participants key={`${season}:${drivers}`} season={season} drivers={drivers} />}
    </WecGuard>
  );
}

function Participants({ season, drivers }: { season: string; drivers: boolean }) {
  const res = useWecParticipants(season, drivers);
  const [search, setSearch] = useState('');
  const title = drivers ? 'Пилоты' : 'Команды';
  const columns: Column<Participant>[] = [
    {
      key: 'name',
      header: drivers ? 'Пилот' : 'Команда',
      render: (row) => <NameFlag who={row.who} kind={drivers ? 'driver' : 'team'} />,
      sortValue: (row) => row.who.name,
    },
    { key: 'category', header: 'Классы и зачёты', render: (row) => row.categories.join(' · ') },
  ];
  return (
    <section className="page">
      <PageHeader eyebrow={`WEC ${seasonLabel(season)}`} title={title}>
        <p className="lead">Заявочный список сезона из Википедии, включая приглашённых и запасных пилотов.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.length === 0}
        emptyText="В статье сезона нет заявочного списка."
      >
        {(data) => {
          const rows = data.filter((row) =>
            row.who.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
          );
          return (
            <>
              <label className="wec-search">
                Поиск по имени
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              {rows.length ? (
                <SortableTable
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.who.article ?? row.who.name}
                  caption={title}
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
