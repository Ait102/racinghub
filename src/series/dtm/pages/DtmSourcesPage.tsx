import { SeriesSources } from '../../../components/SeriesSources';
import { seasonArticle } from '../data/seasons';
import { DtmGuard } from './common';

const MAKES = [
  'Aston Martin',
  'Audi',
  'BMW',
  'Ferrari',
  'Ford',
  'Lamborghini',
  'McLaren',
  'Mercedes',
  'Opel',
  'Porsche',
];

export function DtmSourcesPage() {
  return (
    <DtmGuard>
      {(season) => (
        <SeriesSources
          name="DTM"
          season={season}
          article={seasonArticle(season)}
          makes={MAKES}
          points={
            <p>
              Официальный сайт (
              <a href="https://www.dtm.com/en/standings" target="_blank" rel="noreferrer">
                dtm.com
              </a>
              ) публикует очки каждого участника за каждую гонку и итог сезона. Линия графика — сумма этих
              очков (обновляет <code>scripts/fetch-dtm-points.mjs</code>); зачёт показывается, только если
              сумма у каждого участника совпала с официальным итогом. Сейчас это 2023–2026 и личный зачёт
              2022; сезоны, где суммы расходятся (2021), без графика.
            </p>
          }
        />
      )}
    </DtmGuard>
  );
}
