import { useLocation, useNavigate } from 'react-router-dom';

import { seasonLabel, wecSeasons } from '../data/seasons';
import { wecSeasonFromPath } from '../hooks/data';

/** Season picker for the WEC section; keeps the current page, a race jumps to the calendar. */
export function WecSeasonSelect() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const season = wecSeasonFromPath(pathname);

  function onChange(next: string) {
    const rest = pathname.split('/').slice(3);
    const section = rest[0] === 'race' ? 'calendar' : rest.join('/');
    navigate(`/wec/${next}${section ? '/' + section : ''}${section === 'standings' ? '' : search}`);
  }

  return (
    <label className="season-select">
      <span className="season-select__label">Сезон</span>
      <select value={season ?? ''} onChange={(e) => onChange(e.target.value)}>
        {season === null && <option value="">—</option>}
        {wecSeasons().map((id) => (
          <option key={id} value={id}>
            {seasonLabel(id)}
          </option>
        ))}
      </select>
    </label>
  );
}
