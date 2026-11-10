import { useNavigate } from 'react-router-dom';

/** Season picker for series whose seasons are single years (IMSA, DTM). */
export function YearSeasonSelect({
  series,
  seasons,
  current,
}: {
  series: string;
  seasons: string[];
  current: string | null;
}) {
  const navigate = useNavigate();
  return (
    <label className="season-select">
      <span className="season-select__label">Сезон</span>
      <select
        aria-label="Сезон"
        value={current ?? ''}
        onChange={(event) => navigate(`/${series}/${event.target.value}`)}
      >
        {current === null && <option value="">—</option>}
        {seasons.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </label>
  );
}
