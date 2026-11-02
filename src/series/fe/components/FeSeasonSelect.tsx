import { useLocation, useNavigate } from 'react-router-dom';

import { feSeasonFromPath, feSeasons, seasonLabel } from '../data/seasons';

export function FeSeasonSelect() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const season = feSeasonFromPath(pathname);
  return (
    <label className="season-select">
      <span className="season-select__label">Сезон</span>
      <select
        aria-label="Сезон"
        value={season ?? ''}
        onChange={(event) => {
          const rest = pathname.split('/').slice(3);
          const section = rest[0] === 'race' ? 'calendar' : rest.join('/');
          navigate(`/fe/${event.target.value}${section ? '/' + section : ''}${search}`);
        }}
      >
        {season === null && <option value="">—</option>}
        {feSeasons().map((id) => (
          <option key={id} value={id}>
            {seasonLabel(id)}
          </option>
        ))}
      </select>
    </label>
  );
}
