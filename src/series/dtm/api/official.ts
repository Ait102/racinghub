// Official DTM results (api.dtm.com, open to browsers): every session of a season with its
// classification, as the timing publishes it.
import { createClient, type ApiClient, type GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { parseDtmSessions, type DtmSession } from '../domain/sessions';

export const DTM_API = 'https://api.dtm.com/data';

const client = createClient({
  baseUrl: DTM_API,
  provider: 'DTM (dtm.com)',
  // Whole seasons are large; keep them in memory only.
  storage: null,
  validate: (json) =>
    json && typeof json === 'object' && Array.isArray((json as { wigeResultses?: unknown }).wigeResultses)
      ? null
      : 'Нет данных результатов',
});

export function createDtmOfficial(api: ApiClient = client) {
  return {
    async getSessions(season: string, opts: GetOptions = {}): Promise<Fetched<DtmSession[]>> {
      const query = `?query=wigeResults&raceSeries=DTM&startDate=${season}-01-01&endDate=${season}-12-31&lang=en`;
      const res = await api.get(query, { ...opts, immutable: Number(season) + 1 < new Date().getFullYear() });
      return {
        data: parseDtmSessions(res.data),
        meta: { ...res.meta, sourceUrl: 'https://www.dtm.com/en/results' },
      };
    },
  };
}

export const dtmOfficial = createDtmOfficial();
