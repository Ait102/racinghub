/** Star toggle for a favourite; the series decides where the state is kept. */
export function FavToggle({ on, name, onToggle }: { on: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`fav-btn${on ? ' fav-btn--on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Убрать ${name} из избранного` : `Добавить ${name} в избранное`}
      onClick={onToggle}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {on ? 'В избранном' : 'В избранное'}
    </button>
  );
}
