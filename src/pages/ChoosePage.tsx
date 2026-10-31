import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/** Site start page: pick the championship to look at. */
export function ChoosePage() {
  useEffect(() => {
    document.title = 'Racing Hub · выбор чемпионата';
  }, []);

  return (
    <section className="page choose">
      <header className="page-header">
        <p className="eyebrow">Racing Hub</p>
        <h1>Что смотрим?</h1>
        <p className="lead">Календарь, результаты и зачёты автоспорта. Выберите чемпионат.</p>
      </header>

      <div className="choose__grid">
        <Link to="/f1" className="series-card series-card--f1">
          <span className="series-card__mark" aria-hidden="true">
            F1
          </span>
          <h2 className="series-card__title">Formula 1</h2>
          <p className="series-card__text">
            Календарь, результаты гонок, личный зачёт и Кубок конструкторов, график борьбы за титул, профили
            пилотов, команд и трасс. Сезоны с 1950 года.
          </p>
          <span className="series-card__cta">Открыть →</span>
        </Link>

        <Link to="/wec" className="series-card series-card--wec">
          <span className="series-card__mark" aria-hidden="true">
            WEC
          </span>
          <h2 className="series-card__title">World Endurance Championship</h2>
          <p className="series-card__text">
            Гонки на выносливость с «24 часами Ле-Мана»: календарь, протоколы по классам, квалификация,
            тренировки и все зачёты. Сезоны с 2012 года.
          </p>
          <span className="series-card__cta">Открыть →</span>
        </Link>
      </div>
    </section>
  );
}
