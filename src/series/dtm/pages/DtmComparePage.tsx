import { useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SeriesCompareView } from '../../../components/SeriesCompareView';
import { entryDrivers } from '../../../lib/wikiEntries';
import { useDtmParticipants, useDtmProfile } from '../hooks/data';
import { DtmGuard, DtmName, DtmSourceNote } from './common';

export function DtmComparePage() {
  return <DtmGuard>{(season) => <Compare season={season} />}</DtmGuard>;
}

function Compare({ season }: { season: string }) {
  const [params, setParams] = useSearchParams();
  const a = params.get('a');
  const b = params.get('b');
  const entries = useDtmParticipants(season);
  const pa = useDtmProfile(a, 'driver');
  const pb = useDtmProfile(b, 'driver');
  const drivers =
    entries.status === 'success'
      ? entryDrivers(entries.data)
          .map((d) => d.driver)
          .filter((d) => d.article)
          .sort((x, y) => x.name.localeCompare(y.name))
      : [];
  const pick = (key: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const picker = (key: 'a' | 'b', value: string | null, label: string) => (
    <label className="wiki-compare-pick">
      {label}
      <select value={value ?? ''} onChange={(e) => pick(key, e.target.value)}>
        <option value="">— выберите пилота —</option>
        {value && !drivers.some((d) => d.article === value) && <option value={value}>{value}</option>}
        {drivers.map((d) => (
          <option key={d.article} value={d.article!}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="page">
      <PageHeader eyebrow={`DTM ${season}`} title="Сравнение пилотов">
        <p className="lead">Два пилота рядом: цифры DTM из карточек статей и итоги по сезонам.</p>
      </PageHeader>
      <div className="wiki-compare-pickers">
        {picker('a', a, 'Первый пилот')}
        {picker('b', b, 'Второй пилот')}
      </div>
      {!a || !b ? (
        <p className="muted">Выберите двух пилотов из заявки сезона.</p>
      ) : (
        <DataState state={pa}>
          {(first) => (
            <DataState state={pb}>
              {(second) => (
                <SeriesCompareView
                  a={first}
                  b={second}
                  title={(p) => (
                    <DtmName who={{ name: p.article, article: p.article, flag: null }} kind="driver" />
                  )}
                />
              )}
            </DataState>
          )}
        </DataState>
      )}
      <DtmSourceNote />
    </section>
  );
}
