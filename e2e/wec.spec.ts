// WEC section: data from Wikipedia, served from trimmed real articles (src/series/wec/__fixtures__).
import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

test('WEC opens on the latest season with the next race, winners and leaders', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await page.getByRole('link', { name: /World Endurance Championship/ }).click();
  await expect(page).toHaveURL(/#\/wec\/2026$/);
  await expect(page.getByRole('heading', { level: 1, name: 'WEC 2026' })).toBeVisible();

  // Every 2026 round in the fixtures has a winner except Monza: it is next.
  await expect(page.locator('.hero__name')).toHaveText('6 Hours of Monza');
  await expect(page.locator('.card', { hasText: 'Последняя гонка' })).toContainText('6 Hours of Barcelona');
  const leaders = page.locator('.wec-leaders__table').first();
  await expect(leaders).toContainText("Hypercar World Endurance Drivers' Championship");
  await expect(leaders.locator('li').first()).toContainText('Sébastien Buemi');
  await expect(leaders.locator('li').first()).toContainText('114');
  await expect(page.getByText('CC BY-SA 4.0').first()).toBeVisible();
});

test('WEC calendar marks Le Mans, shows class winners and cancelled races', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/calendar');
  const cards = page.locator('.race-card');
  await expect(cards).toHaveCount(8);
  const lm = page.locator('.race-card[data-round="3"]');
  await expect(lm).toContainText('24 Hours of Le Mans');
  await expect(lm.locator('.lemans-badge')).toHaveText('24 часа');
  await expect(lm.locator('.race-card__winner')).toHaveCount(2);
  await expect(page.locator('.race-card--next')).toContainText('6 Hours of Monza');
  await expect(page.locator('.cancelled li')).toHaveCount(2);

  await page.getByRole('button', { name: /Предстоящий/ }).click();
  await expect(cards).toHaveCount(1);
});

test('WEC race: classification by class, qualifying and practice', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/calendar');
  await page.locator('.race-card[data-round="3"]').click();
  await expect(page).toHaveURL(/#\/wec\/2026\/race\/3$/);
  await expect(page.getByRole('heading', { level: 1, name: '24 Hours of Le Mans' })).toBeVisible();
  await expect(page.locator('.winners--cards .winners__item')).toHaveCount(2);

  const rows = page.locator('[role=tabpanel] tbody tr');
  await expect(rows.first()).toContainText('Toyota Racing');
  await expect(rows.first()).toContainText('Kamui Kobayashi');
  await page.getByRole('button', { name: 'LMGT3', exact: true }).click();
  await expect(rows.first()).toContainText('Iron Lynx');
  for (const text of await rows.allInnerTexts()) expect(text).not.toContain('Hypercar');

  await page.getByRole('tab', { name: 'Квалификация' }).click();
  await expect(page.getByRole('columnheader', { name: 'Hyperpole 1' })).toBeVisible();
  await page.getByRole('tab', { name: 'Тренировки' }).click();
  await expect(page.locator('.practice')).toHaveCount(4);
});

test('WEC standings: every championship, both manufacturer cars, colors', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/standings');
  await expect(
    page.getByRole('heading', { level: 2, name: "Hypercar World Endurance Drivers' Championship" }),
  ).toBeVisible();
  await expect(page.locator('.wec-standings tbody tr').first()).toContainText('114');
  await expect(page.locator('.wec-standings tbody tr').first().locator('.res--gold').first()).toHaveText('1');

  await page.getByRole('button', { name: "Hypercar World Endurance Manufacturers' Championship" }).click();
  await expect(page).toHaveURL(/standings\?t=hypercar-world-endurance-manufacturers-championship$/);
  const toyota = page.locator('.wec-standings tbody tr').first();
  await expect(toyota).toContainText('Toyota');
  // Two cars score for a manufacturer: two results per round.
  await expect(toyota.locator('td.wec-standings__cell').first().locator('.res')).toHaveCount(2);
});

test('WEC season switch keeps the page and reads older eras', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/standings');
  await expect(page.locator('.wec-standings')).toBeVisible();
  await page.getByLabel('Сезон').selectOption('2012');
  await expect(page).toHaveURL(/#\/wec\/2012\/standings$/);
  await expect(page.locator('.wec-standings tbody tr').first()).toContainText('172.5');

  await page.getByLabel('Сезон').selectOption('2019-20');
  await page.getByRole('link', { name: 'Календарь' }).click();
  await expect(page.locator('.race-card')).toHaveCount(8);
  await expect(page.locator('.race-card[data-round="5"]')).toContainText('23 February 2020');
});

test('WEC shows an error when Wikipedia is down and recovers on retry', async ({ page }) => {
  let down = true;
  await mockApi(page, undefined, { wecFail: () => down });
  await page.goto('./#/wec/2026/calendar');
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 30_000 });
  down = false;
  await alert.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.locator('.race-card')).toHaveCount(8);
});

test('unknown WEC season and round get a clear message', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2020');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Такого сезона WEC нет');
  await page.goto('./#/wec/2026/race/42');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Этап не найден');
});

test('WEC drivers list links to career and Le Mans, keeps profile on season change', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026');
  await page.getByRole('link', { name: 'Пилоты', exact: true }).click();
  await page.getByRole('link', { name: 'Sébastien Buemi', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sébastien Buemi');
  await expect(page.locator('figure.photo img')).toBeVisible();
  await expect(page.locator('figure.photo')).toContainText('Test Photographer');
  await expect(page.locator('figure.photo')).toContainText('CC BY-SA 4.0');
  await expect(page.getByRole('heading', { name: 'Результаты WEC', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '24 часа Ле-Мана', exact: true })).toBeVisible();
  await expect(page.locator('.wec-profile-history')).toContainText('106.25');
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2012');
  await expect(page).toHaveURL(/#\/wec\/2012\/driver\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sébastien Buemi');
  await expect(page.locator('.wec-profile-season')).toContainText('Сезон 2012');
  await expect(page.locator('.wec-profile-season')).toContainText('участник не найден');
});

test('WEC race links drivers and teams, team keeps multiple cars and historical points', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/race/3');
  await page.getByRole('link', { name: 'Toyota Racing', exact: true }).first().click();
  await expect(page).toHaveURL(/\/team\//);
  await expect(page.locator('.wec-profile-history')).toContainText('142.5');
  await page.goto('./#/wec/2026/race/3');
  await page.getByRole('link', { name: 'Kamui Kobayashi', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kamui Kobayashi');
});

test('WEC calendar links a circuit to event winners across years without nested links', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/calendar');
  await expect(page.locator('a a')).toHaveCount(0);
  await page.getByRole('link', { name: /История.*Spa/ }).click();
  await expect(page.locator('.wec-profile-history')).toContainText('1953');
  await expect(page.locator('.wec-profile-history')).toContainText('2025');
  await expect(page.getByText(/общих победителей/i)).toBeVisible();
});

test('WEC teams list and empty article explain source limitations', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/teams');
  await expect(page.getByRole('link', { name: 'Toyota Racing', exact: true }).first()).toBeVisible();
  await page.goto('./#/wec/2026/team/Toyota');
  await expect(page.getByText('В статье нет таблиц результатов WEC.')).toBeVisible();
  await expect(page.locator('.wec-profile-season')).toContainText('Toyota');
  await page.goto('./#/wec/2026/driver/Tom%20Gamble%20(racing%20driver)');
  await expect(page.locator('.wec-profile-entry img.flag')).toBeVisible();
  await expect(page.locator('.wec-profile-entry')).toContainText('Hypercar');
  await page.goto('./#/wec/2026/driver/File%3AExample.jpg');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Недопустимый адрес профиля');
});

test('WEC profiles handle a missing article and recover after Wikipedia failure', async ({ page }) => {
  let down = false;
  await mockApi(page, undefined, { wecFail: () => down });
  await page.goto('./#/wec/2026/driver/No_such_driver');
  await expect(page.getByRole('alert')).toContainText('Статья не найдена');
  down = true;
  await page.goto('./#/wec/2026/driver/Kamui%20Kobayashi');
  const profileError = page.locator('.wec-profile-history').getByRole('alert');
  await expect(profileError).toBeVisible({ timeout: 30_000 });
  down = false;
  await profileError.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.getByRole('heading', { name: 'Результаты WEC', exact: true })).toBeVisible();
});

test('WEC lists and profiles fit mobile and permit keyboard navigation', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of [
    'drivers',
    'teams',
    'driver/S%C3%A9bastien%20Buemi',
    'team/Toyota%20Racing%20GmbH',
    'circuit/6%20Hours%20of%20Spa-Francorchamps',
  ]) {
    await page.goto(`./#/wec/2026/${path}`);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(
      0,
    );
  }
  await page.goto('./#/wec/2026/drivers');
  await page.getByRole('searchbox', { name: 'Поиск по имени' }).fill('Buemi');
  const driver = page.getByRole('link', { name: 'Sébastien Buemi', exact: true });
  await driver.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sébastien Buemi');
});
