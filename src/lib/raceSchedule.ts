export interface WeekendSession {
  label: string;
  start: string | null;
  kind?: 'race' | 'sprint';
  cancelled?: boolean;
}

export interface WeekendScheduleData {
  sessions: WeekendSession[];
  source: string;
  update?: string;
  note?: string;
}

/** Keep each source's local date and offset together, including sessions crossing midnight UTC. */
export function scheduleDay(
  date: string,
  offset: string,
  sessions: [label: string, time: string, kind?: WeekendSession['kind']][],
): WeekendSession[] {
  return sessions.map(([label, time, kind]) => ({ label, start: `${date}T${time}:00${offset}`, kind }));
}
