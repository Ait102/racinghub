import { SeriesSources } from '../../../components/SeriesSources';
import { seasonArticle } from '../data/seasons';
import { ImsaGuard } from './common';

const MAKES = [
  'Acura',
  'Aston Martin',
  'Audi',
  'BMW',
  'Cadillac',
  'Corvette',
  'Ferrari',
  'Ford',
  'Lamborghini',
  'Lexus',
  'McLaren',
  'Mercedes',
  'Porsche',
];

export function ImsaSourcesPage() {
  return (
    <ImsaGuard>
      {(season) => (
        <SeriesSources
          name="IMSA"
          season={season}
          article={seasonArticle(season)}
          makes={MAKES}
          points={
            <p>
              Накопленные очки — из официальных файлов «POINTS DATA» каждого этапа на{' '}
              <a href="https://imsa.results.alkamelcloud.com/" target="_blank" rel="noreferrer">
                imsa.results.alkamelcloud.com
              </a>{' '}
              (столбец Points — итог после этапа; обновляет <code>scripts/fetch-imsa-points.mjs</code>). Есть
              сезоны 2025 и 2026; раньше итоги публиковались в основном в PDF. Этап, после которого
              опубликованы только предварительные итоги, оставлен пустым. Классы, не ехавшие на этапе, его не
              получают.
            </p>
          }
        />
      )}
    </ImsaGuard>
  );
}
