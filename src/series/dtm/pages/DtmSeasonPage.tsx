import { useParams } from 'react-router-dom';

import { UpcomingSeasonPage } from '../../../components/UpcomingSeasonPage';
import { dtm, seasonArticle } from '../data/seasons';

const PLANNED = [
  'Календарь: две гонки на каждом этапе',
  'Протоколы гонок и квалификаций',
  'Зачёты пилотов, команд и производителей',
  'Участники, профили пилотов и команд, эмблемы марок',
];

export function DtmSeasonPage() {
  const { season = '' } = useParams();
  return (
    <UpcomingSeasonPage
      series="dtm"
      name="DTM"
      season={season}
      valid={dtm.isSeasonId(season)}
      latest={dtm.seasons()[0]}
      article={seasonArticle(season)}
      planned={PLANNED}
      onSeason={dtm.remember}
    />
  );
}
