// Two drivers side by side (IMSA, DTM): the infobox figures of the series and the season results
// of each, as published. Nothing is added up or recounted.
import type { ReactNode } from 'react';

import { seasonResults, type SeasonResult, type SeriesProfile } from '../lib/wikiProfile';

const FIGURES = [
  'Дебют',
  'Старты',
  'Победы',
  'Подиумы',
  'Поулы',
  'Быстрые круги',
  'Титулы',
  'Лучший итог',
  'Команда',
];

const seasonText = (rows: SeasonResult[]) =>
  rows.length
    ? rows
        .map((r) =>
          [r.position ?? '—', r.points ? `${r.points} оч.` : null, r.cls].filter(Boolean).join(' · '),
        )
        .join('; ')
    : '—';

export function SeriesCompareView({
  a,
  b,
  title,
}: {
  a: SeriesProfile;
  b: SeriesProfile;
  title: (profile: SeriesProfile) => ReactNode;
}) {
  const fact = (p: SeriesProfile, label: string) => p.facts.find((f) => f.label === label)?.value ?? '—';
  const figures = FIGURES.filter((label) => fact(a, label) !== '—' || fact(b, label) !== '—');
  const resultsA = seasonResults(a.tables);
  const resultsB = seasonResults(b.tables);
  const seasons = [...new Set([...resultsA, ...resultsB].map((r) => r.season))].sort().reverse();
  return (
    <>
      <h2 className="section-title">Карточки статей</h2>
      <div className="table-wrap">
        <table className="table wiki-compare">
          <caption className="visually-hidden">Цифры из карточек статей</caption>
          <thead>
            <tr>
              <th scope="col">Показатель</th>
              <th scope="col">{title(a)}</th>
              <th scope="col">{title(b)}</th>
            </tr>
          </thead>
          <tbody>
            {figures.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  В карточках статей нет цифр этой серии.
                </td>
              </tr>
            )}
            {figures.map((label) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{fact(a, label)}</td>
                <td>{fact(b, label)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="section-title">По сезонам</h2>
      {seasons.length === 0 ? (
        <p className="muted">В статьях нет таблиц результатов этой серии.</p>
      ) : (
        <div className="table-wrap">
          <table className="table wiki-compare">
            <caption className="visually-hidden">Место и очки по сезонам</caption>
            <thead>
              <tr>
                <th scope="col">Сезон</th>
                <th scope="col">{title(a)}</th>
                <th scope="col">{title(b)}</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season}>
                  <th scope="row">{season}</th>
                  <td>{seasonText(resultsA.filter((r) => r.season === season))}</td>
                  <td>{seasonText(resultsB.filter((r) => r.season === season))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">Цифры и места — из статей Википедии, как их публикует источник.</p>
    </>
  );
}
