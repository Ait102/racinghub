import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SeriesParticipants } from '../../../components/SeriesParticipants';
import { useImsaParticipants } from '../hooks/data';
import { ClassTag, ImsaGuard, ImsaName, ImsaSourceNote } from './common';

export function ImsaParticipantsPage({ drivers }: { drivers: boolean }) {
  return (
    <ImsaGuard>
      {(season) => <Participants key={`${season}:${drivers}`} season={season} drivers={drivers} />}
    </ImsaGuard>
  );
}

function Participants({ season, drivers }: { season: string; drivers: boolean }) {
  const res = useImsaParticipants(season);
  return (
    <section className="page">
      <PageHeader eyebrow={`IMSA ${season}`} title={drivers ? 'Пилоты' : 'Команды'}>
        <p className="lead">
          Заявочный список сезона из Википедии по классам: номер, команда, машина и этапы каждого пилота.
        </p>
      </PageHeader>
      {drivers && (
        <p>
          <Link to={`/imsa/${season}/compare`}>Сравнить пилотов</Link>
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
            name={(who, kind) => <ImsaName who={who} kind={kind} />}
            classTag={(cls) => <ClassTag cls={cls} />}
          />
        )}
      </DataState>
      <ImsaSourceNote />
    </section>
  );
}
