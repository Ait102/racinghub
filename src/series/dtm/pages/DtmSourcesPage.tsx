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
              Графика накопленных очков у DTM нет: официальный сайт (
              <a href="https://www.dtm.com/en/standings" target="_blank" rel="noreferrer">
                dtm.com
              </a>
              ) публикует очки за каждую гонку и итог сезона, но не итог после каждого этапа, а складывать
              очки сайт не будет. В зачётах есть места по гонкам и их график.
            </p>
          }
        />
      )}
    </DtmGuard>
  );
}
