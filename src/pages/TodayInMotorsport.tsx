import { Link } from 'react-router-dom';

import { useNow } from '../hooks/useNow';
import { daysTo, upcomingRaces, type HubRace } from '../lib/hub';
import { HUB_LABELS, useHubs } from './hubs';

function when(race: HubRace, now: Date): string {
  const days = daysTo(race, now);
  if (days < 0) return 'идёт';
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  return `через ${days} дн.`;
}

function dateLabel(race: HubRace): string {
  const day = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  // Only F1 gives a start time; it is shown in the visitor's time zone.
  const time =
    race.start.length > 10
      ? `, ${new Date(race.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
      : '';
  return race.end && race.end !== race.start
    ? `${day(race.start)} – ${day(race.end)}`
    : `${day(race.start)}${time}`;
}

/** Start page: the next races of every championship, soonest first. */
export function TodayInMotorsport() {
  const hubs = useHubs();
  const now = useNow(60_000);
  const races = hubs ? upcomingRaces(hubs.hubs, now) : [];
  return (
    <section className="today" aria-labelledby="today-title">
      <h2 className="section-title" id="today-title">
        Сегодня в автоспорте
      </h2>
      {!hubs ? (
        <p className="muted" role="status">
          Собираем календари чемпионатов…
        </p>
      ) : races.length === 0 ? (
        <p className="muted">У источников нет предстоящих гонок текущих сезонов.</p>
      ) : (
        <ol className="today__list">
          {races.map((race) => (
            <li key={`${race.hub.series}-${race.to}`}>
              <Link to={race.to} className={`today__race today__race--${race.hub.series}`}>
                <span className="today__series">{race.hub.label}</span>
                <span className="today__name">{race.name}</span>
                <span className="today__place muted small">{race.place ?? ''}</span>
                <span className="today__date small">{dateLabel(race)}</span>
                <span className={`today__when${daysTo(race, now) <= 0 ? ' is-now' : ''}`}>
                  {when(race, now)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {hubs && hubs.failed.length > 0 && (
        <p className="muted small">
          Нет данных: {hubs.failed.map((id) => HUB_LABELS[id]).join(', ')} — источник не ответил.
        </p>
      )}
      <p className="muted small">
        Даты — по календарям источников (Jolpica-F1 и Википедия); время старта есть только у F1.
      </p>
    </section>
  );
}
