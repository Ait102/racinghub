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
