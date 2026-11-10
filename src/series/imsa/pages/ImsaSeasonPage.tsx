import { useParams } from 'react-router-dom';

import { UpcomingSeasonPage } from '../../../components/UpcomingSeasonPage';
import { imsa, seasonArticle } from '../data/seasons';

const PLANNED = [
  'Календарь сезона с «24 часами Дайтоны» и «12 часами Себринга»',
  'Протоколы гонок по классам GTP, LMP2, GTD Pro и GTD',
  'Зачёты пилотов, команд и производителей в каждом классе',
  'Заявки, экипажи, профили пилотов и команд',
];

export function ImsaSeasonPage() {
  const { season = '' } = useParams();
  return (
    <UpcomingSeasonPage
      series="imsa"
      name="IMSA"
      season={season}
      valid={imsa.isSeasonId(season)}
      latest={imsa.seasons()[0]}
      article={seasonArticle(season)}
      planned={PLANNED}
      onSeason={imsa.remember}
    />
  );
}
