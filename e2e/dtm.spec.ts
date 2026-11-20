import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

test('DTM season: home, two races per event, race results and standings', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/dtm/2026');
  await expect(page.locator('html')).toHaveAttribute('data-series', 'dtm');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('DTM 2026');
  await expect(page.getByRole('article', { name: "Drivers' championship" })).toContainText('Thomas Preining');

  await page.getByRole('link', { name: 'Календарь', exact: true }).click();
  await expect(page.locator('.race-card')).toHaveCount(16);
  await expect(page.locator('.race-card').nth(1)).toContainText('Этап 1 · гонка 2');
  await page.locator('.race-card').first().click();
  await expect(page).toHaveURL(/#\/dtm\/2026\/race\/1$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Red Bull Ring');
  const first = page.getByRole('table', { name: 'Результаты гонки' }).locator('tbody tr').first();
  await expect(first).toContainText('Thomas Preining');
  // The qualifying-points superscript stays apart from the place.
  await expect(first.locator('sup')).toHaveText('3');

  // Changing the season keeps the section; a race page goes to the calendar.
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2000');
  await expect(page).toHaveURL(/#\/dtm\/2000\/calendar$/);
  await expect(page.locator('.race-card', { hasText: 'Отменена' })).toContainText('monsoon');

  await page.getByRole('link', { name: 'Зачёты', exact: true }).click();
  await expect(page.getByRole('table', { name: "Drivers' championship" })).toContainText('Bernd Schneider');
  await page.getByRole('button', { name: "Teams' Championship" }).click();
  await expect(page.getByRole('table', { name: "Teams' Championship" })).toContainText('D2 AMG-Mercedes');
  await expect(page.locator('footer')).toContainText('CC BY-SA 4.0');
});

test('DTM entry list, profiles of a driver, a team and a circuit, comparison', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/dtm/2026/drivers');
  await page.getByRole('searchbox').fill('preining');
  const row = page.getByRole('table', { name: 'Пилоты' }).locator('tbody tr');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('91');
  await row.getByRole('link', { name: 'Thomas Preining' }).click();
  await expect(page).toHaveURL(/#\/dtm\/2026\/driver\/Thomas%20Preining$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thomas Preining');
  // Figures as the infobox publishes them; the season's place from the standings.
  await expect(page.locator('.stats')).toContainText('79');
  await expect(page.locator('.wiki-profile-season')).toContainText('1 место');
  await expect(
    page.getByRole('table', { name: 'Complete Deutsche Tourenwagen Masters results' }),
  ).toContainText('225');

  await page.getByRole('link', { name: 'Сравнить с другим пилотом' }).click();
  await page.getByRole('combobox', { name: 'Второй пилот' }).selectOption('Maro Engel');
  await expect(page.getByRole('table', { name: 'Цифры из карточек статей' })).toContainText('Старты');
  await expect(page.getByRole('table', { name: 'Место и очки по сезонам' })).toContainText('2026');

  await page.goto('./#/dtm/2026/teams');
  await page.getByRole('link', { name: 'Manthey Racing' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Manthey Racing');
  await expect(page.locator('.wiki-profile-facts')).toContainText('Meuspath');

  await page.goto('./#/dtm/2026/race/1');
  await page.locator('.dtm-facts').getByRole('link', { name: 'Red Bull Ring' }).click();
  await expect(page.locator('.stats').last()).toContainText('4.326 km');
});

test('DTM points after each race as in F1, checked against the season total; sources list the makes', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('./#/dtm/2026/standings');
  await expect(page.getByRole('heading', { name: 'Очки после каждого этапа' })).toBeVisible();
  await page.getByText('Таблица очков по этапам и источники').click();
  const points = page.getByRole('table', { name: 'Очки после каждого этапа' });
  await expect(points.locator('tbody tr').first()).toContainText('Thomas Preining');
  await expect(points.locator('tbody tr').first()).toContainText('225');
  await page.goto('./#/dtm/2026/about');
  await expect(page.locator('.wiki-source-emblems')).toContainText('Opel');
});

test('DTM timetable of both races and the circuit map; the header search finds circuits', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('./#/dtm/2026/race/3');
  const schedule = page.getByRole('region', { name: 'Расписание' });
  await expect(schedule).toContainText('Гонка 1');
  await expect(schedule).toContainText('Гонка 2');
  await expect(page.getByRole('img', { name: /Схема трассы Circuit Zandvoort/ })).toBeVisible();

  await page.getByRole('button', { name: 'Поиск' }).click();
  await page.getByRole('combobox', { name: 'Пилот, команда или трасса любого чемпионата' }).fill('zandvoort');
  const option = page.getByRole('option').filter({ hasText: 'DTM' }).filter({ hasText: 'трасса' });
  await option.first().click();
  await expect(page).toHaveURL(/#\/dtm\/2026\/circuit\//);
});

test('DTM race page shows every session of the event with official results', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/dtm/2026/race/2');
  const sessions = page.getByRole('region', { name: 'Результаты сессий' });
  // Race 2 of the event is open first.
  await expect(sessions.getByRole('button', { name: 'Гонка 2' })).toHaveAttribute('aria-pressed', 'true');
  await sessions.getByRole('button', { name: 'Гонка 1' }).click();
  await expect(sessions.locator('tbody tr').first()).toContainText('Thomas Preining');
  await expect(sessions.locator('tbody tr').first()).toContainText('1:28.899');
  await sessions.getByRole('button', { name: 'Свободная практика 1' }).click();
  await expect(sessions.locator('tbody tr')).toHaveCount(5);
});
