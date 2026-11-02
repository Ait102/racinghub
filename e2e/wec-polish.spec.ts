import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

test('historical WEC home keeps the published championship names visible', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2019-20');
  const titles = page.locator('.wec-home-standing-title');
  await expect(titles).toHaveCount(4);
  await expect(titles.filter({ hasText: "World Endurance LMP Drivers' Championship" })).toBeVisible();
  await expect(titles.filter({ hasText: "World Endurance GTE Drivers' Championship" })).toBeVisible();
});

test('WEC home links to its sources and keeps its own navigation and footer', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026');
  const nav = page.getByRole('navigation', { name: 'Основная навигация' });
  await expect(nav.getByRole('link', { name: 'Главная', exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Прогресс сезона' })).toHaveAttribute(
    'aria-valuemax',
    '8',
  );
  await expect(page.locator('.wec-home-classes .class-mark--hypercar')).toHaveText(/HYPER\s*CAR/);
  await expect(page.locator('.footer')).toContainText('Википедия');
  await nav.getByRole('link', { name: 'Источники', exact: true }).click();
  await expect(page).toHaveURL(/#\/wec\/2026\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Источники данных' })).toBeVisible();
  await expect(
    page.locator('main').getByRole('link', { name: 'Wikimedia Commons', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'Peugeot', exact: true })).toHaveAttribute(
    'href',
    /File:Peugeot/,
  );
  await expect(page.locator('html')).toHaveAttribute('data-series', 'wec');
  await page.getByLabel('Сезон').selectOption('2019-20');
  await expect(page).toHaveURL(/#\/wec\/2019-20\/about$/);
});

test('WEC calendar has no extra links under a stage card', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/calendar');
  await expect(page.locator('.race-card')).toHaveCount(8);
  // Each stage is one card link; the circuit and winners open from the race page.
  await expect(page.locator('.wec-calendar-item a')).toHaveCount(8);
});

test('WEC race and circuit profile show the correct outline, facts and attribution', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/race/3');
  const panel = page.locator('.wec-circuit-panel');
  await expect(panel.getByRole('img', { name: /13.626 км/ })).toBeVisible();
  await expect(panel).toContainText('дороги общего пользования');
  await expect(panel.getByRole('link', { name: 'ODbL' })).toBeVisible();
  await page.goto(
    './#/wec/2026/circuit/6%20Hours%20of%20Spa-Francorchamps?circuit=Circuit%20de%20Spa-Francorchamps',
  );
  await expect(page.locator('.wec-circuit-panel').getByRole('img', { name: /7.004 км/ })).toBeVisible();
  await expect(page.locator('.wec-circuit-panel')).toContainText('Арденнах');
});

test('WEC chart remains readable with selected round details on a phone', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./#/wec/2026/standings');
  await page.getByRole('button', { name: 'Топ-10' }).click();
  const chart = page.locator('.wec-places-chart');
  await chart.getByRole('img').focus();
  await page.keyboard.press('End');
  await expect(chart.getByRole('status')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const chartBox = await chart.boundingBox();
  const tipBox = await chart.getByRole('status').boundingBox();
  expect(tipBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
  expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  await page.keyboard.press('Escape');
  await expect(chart.getByRole('status')).toHaveCount(0);
});

test('WEC driver facts, additional photo formats and all team models are shown with sources', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/driver/S%C3%A9bastien%20Buemi');
  const facts = page.locator('.wec-profile-summary');
  await expect(facts).toContainText('31 October 1988');
  await expect(facts).toContainText('Swiss');
  await expect(facts.locator('[lang="en"]')).toContainText('Sébastien Olivier Humbert Buemi');
  await expect(facts.getByRole('link', { name: 'Википедия', exact: true })).toHaveAttribute('href', /Buemi/);
  await page.goto('./#/wec/2026/driver/Kamui%20Kobayashi');
  await expect(page.locator('.page-header figure.photo')).toContainText('CC BY-SA 4.0');
  await page.goto('./#/wec/2026/team/AF%20Corse');
  const cars = page.locator('.wec-cars');
  await expect(cars.locator('.wec-cars__item')).toHaveCount(2);
  await expect(cars.getByRole('heading', { name: 'Ferrari 499P', exact: true })).toBeVisible();
  await expect(cars.getByRole('heading', { name: 'Ferrari 296 GT3 Evo', exact: true })).toBeVisible();
  await expect(cars.locator('figure.photo')).toHaveCount(2);
  await expect(cars.getByRole('link', { name: 'Википедия', exact: true })).toBeVisible();
});
