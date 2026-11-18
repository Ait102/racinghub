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
  await expect(page.locator('.stats')).toContainText('4.326 km');
});

test('DTM explains why there is no cumulative points chart; sources list the makes', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/dtm/2026/standings');
  await expect(page.locator('main')).toContainText('Графика накопленных очков нет');
  await page.goto('./#/dtm/2026/about');
  await expect(page.locator('.wiki-source-emblems')).toContainText('Opel');
});
