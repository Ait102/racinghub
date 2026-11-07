import type { WeekendScheduleData } from '../lib/raceSchedule';
import { Moment } from './ui';

export function ScheduleMoment({ start }: { start: string }) {
  if (start.length === 10) return <Moment date={start} time={null} />;
  const utc = new Date(start).toISOString();
  return <Moment date={utc.slice(0, 10)} time={`${utc.slice(11, 19)}Z`} />;
}

export function WeekendSchedule({ schedule }: { schedule: WeekendScheduleData }) {
  return (
    <section className="card schedule race-weekend" aria-label="Расписание">
      <h2 className="card__title">Расписание</h2>
      {schedule.note && <p className="muted small">{schedule.note}</p>}
      {schedule.sessions.length > 0 ? (
        <ol className="schedule__list">
          {schedule.sessions.map((session) => (
            <li key={session.label} className={session.kind ? `schedule__${session.kind}` : undefined}>
              <span>{session.label}</span>
              {session.cancelled ? (
                <small className="muted">Отменена</small>
              ) : session.start ? (
                <ScheduleMoment start={session.start} />
              ) : (
                <small className="muted">Дата и время не объявлены</small>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted small">Расписание сессий для этого этапа недоступно.</p>
      )}
      {schedule.sessions.some((session) => session.start && session.start.length > 10) && (
        <p className="muted small">Время указано в вашем часовом поясе.</p>
      )}
      <div className="race-weekend__sources small">
        <a href={schedule.source} target="_blank" rel="noreferrer">
          {schedule.sessions.length > 0 ? 'Официальное расписание ↗' : 'Официальный календарь ↗'}
        </a>
        {schedule.update && (
          <a href={schedule.update} target="_blank" rel="noreferrer">
            Обновление расписания ↗
          </a>
        )}
      </div>
    </section>
  );
}
