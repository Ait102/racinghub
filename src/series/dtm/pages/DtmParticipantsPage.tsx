import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SeriesParticipants } from '../../../components/SeriesParticipants';
import { useDtmParticipants } from '../hooks/data';
import { DtmGuard, DtmName, DtmSourceNote } from './common';

export function DtmParticipantsPage({ drivers }: { drivers: boolean }) {
  return (
    <DtmGuard>
      {(season) => <Participants key={`${season}:${drivers}`} season={season} drivers={drivers} />}
    </DtmGuard>
  );
}

function Participants({ season, drivers }: { season: string; drivers: boolean }) {
  const res = useDtmParticipants(season);
  return (
    <section className="page">
      <PageHeader eyebrow={`DTM ${season}`} title={drivers ? 'Пилоты' : 'Команды'}>
        <p className="lead">
          Заявочный список сезона из Википедии: номер, команда, машина и этапы каждого пилота, с отметками
          источника.
        </p>
      </PageHeader>
      {drivers && (
        <p>
          <Link to={`/dtm/${season}/compare`}>Сравнить пилотов</Link>
        </p>
      )}
      <DataState
        state={res}
        isEmpty={(data) => data.length === 0}
        emptyText="В статье сезона пока нет заявочного списка."
      >
        {(crews) => (
          <SeriesParticipants
            crews={crews}
            drivers={drivers}
            name={(who, kind) => <DtmName who={who} kind={kind} emblem={kind === 'team'} />}
          />
        )}
      </DataState>
      <DtmSourceNote />
    </section>
  );
}
