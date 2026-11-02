import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

test('FE navigation remembers selected season and keeps its licence', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2025-26');
  await expect(page.locator('html')).toHaveAttribute('data-series', 'fe');
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.locator('.fe-home-last')).toContainText('Последняя гонка');
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2019-20');
  await page.getByRole('link', { name: 'Календарь', exact: true }).click();
  await expect(page.locator('.fe-calendar-item').first()).toBeVisible();
  await page.getByRole('link', { name: 'Источники', exact: true }).click();
  await expect(page.locator('footer')).toContainText('CC BY-SA 4.0');
  await page.getByRole('link', { name: 'FE', exact: true }).click();
  await expect(page).toHaveURL(/#\/fe\/2019-20$/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Сезон' })).toHaveValue('2019-20');
});

test('FE calendar keeps separate double-header rounds and qualifying', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2025-26/calendar');
  await expect(page.locator('.fe-calendar-item')).toHaveCount(17);
  await expect(page.locator('[data-round="9"]')).toContainText('гонка 1');
  await expect(page.locator('[data-round="10"]')).toContainText('гонка 2');
  await page.locator('[data-round="9"]').click();
  await expect(page.locator('main')).toContainText('Nyck de Vries');
  await expect(page.locator('main')).toContainText('Квалификация');
  await page.getByRole('button', { name: 'Квалификация', exact: true }).click();
  await expect(page.locator('main')).toContainText('Дуэли');
  await expect(page.locator('main .meta').last()).toContainText('Википедия');
  await page.getByRole('link', { name: 'Race 2', exact: true }).click();
  await expect(page).toHaveURL(/#\/fe\/2025-26\/race\/10$/);
  await expect(page.locator('.fe-race-summary')).toContainText('Oliver Rowland');
  await expect(page.locator('main table tbody tr').first()).toContainText('Oliver Rowland');
});

test('FE single race includes classification and track details', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2025-26/race/1');
  await expect(page.locator('main')).toContainText('São Paulo');
  await expect(page.locator('main table').first()).toBeVisible();
  await expect(page.locator('main')).toContainText('Квалификация');
  await expect(page.locator('main')).toContainText('О трассе');
});

test('FE standings chart and favourites are independent of WEC', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2025-26/standings');
  await expect(page.locator('.fe-places-chart svg')).toBeVisible();
  await page.locator('.fe-places-chart svg').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.fe-places-chart [role="status"]')).toContainText('SAO');
  const favorite = page.getByRole('button', { name: /^Добавить .* в избранное$/ }).first();
  await favorite.click();
  await expect(page.getByRole('button', { name: /^Убрать .* из избранного$/ }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await expect(page.locator('.fe-favorites-list li')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('racinghub:wec:favorites'))).toBeNull();
});

test('FE first season and Berlin season keep historical calendars', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2014-15/calendar');
  await expect(page.locator('.fe-calendar-item')).toHaveCount(11);
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2019-20');
  await expect(page.locator('.fe-calendar-item')).toHaveCount(11);
  await expect(page.locator('main')).toContainText('Berlin');
});

test('FE missing article stays friendly and source error can be retried', async ({ page }) => {
  let fail = true;
  await mockApi(page, undefined, { wecFail: () => fail });
  await page.goto('./#/fe/2025-26/calendar');
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 });
  fail = false;
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.locator('.fe-calendar-item')).toHaveCount(17);
  await page.goto('./#/fe/2026-27');
  await expect(page.locator('main')).toContainText(/Статья сезона ещё не опубликована/i);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('FE pages fit a phone and reject an invalid season', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const section of ['', '/calendar', '/standings', '/race/9', '/about']) {
    await page.goto(`./#/fe/2025-26${section}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.skeleton')).toHaveCount(0);
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      elements: [...document.querySelectorAll('main *')]
        .filter((node) => node.getBoundingClientRect().right > innerWidth + 1 && !node.closest('table'))
        .map((node) => ({
          tag: node.tagName,
          cls: node.className,
          right: node.getBoundingClientRect().right,
          width: node.getBoundingClientRect().width,
          overflow: getComputedStyle(node).overflowX,
        })),
      wrappers: [
        ...document.querySelectorAll(
          'main, main > section, .fe-standings-scroll, .fe-places-card, .fe-places-chart, .fe-places-card .legend',
        ),
      ].map((node) => ({
        tag: node.tagName,
        cls: node.className,
        right: node.getBoundingClientRect().right,
        width: node.getBoundingClientRect().width,
        scroll: node.scrollWidth,
        overflow: getComputedStyle(node).overflowX,
        display: getComputedStyle(node).display,
      })),
    }));
    expect(overflow.width, `${section}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport);
  }
  await page.goto('./#/fe/2026-28');
  await expect(page.getByRole('heading', { name: 'Такого сезона Formula E нет' })).toBeVisible();
});

test('FE entry lists lead to driver, team and E-Prix profiles', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2025-26/drivers');
  await page.getByRole('searchbox', { name: /Поиск/ }).fill('Wehrlein');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Pascal Wehrlein', exact: true }).click();
  await expect(page).toHaveURL(/#\/fe\/2025-26\/driver\/Pascal%20Wehrlein$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pascal Wehrlein');
  await expect(page.locator('.stats')).toContainText('Старты');
  await expect(page.locator('.fe-profile-season')).toContainText('169');
  await expect(page.getByRole('heading', { name: 'Результаты по сезонам' })).toBeVisible();
  await page.getByRole('button', { name: /Добавить Pascal Wehrlein в избранное/ }).click();

  await page.goto('./#/fe/2025-26/teams');
  // Customer teams get the make of their powertrain.
  await expect(
    page.locator('tbody tr', { hasText: 'Andretti' }).locator('.team-logo--emblem img').first(),
  ).toHaveAttribute('src', /porsche\.png$/);
  await page.getByRole('link', { name: 'Jaguar TCS Racing', exact: true }).first().click();
  await expect(page.locator('.page-header .team-logo--emblem img')).toHaveAttribute('src', /jaguar\.png$/);
  await expect(page.locator('.stats')).toContainText('Гонки');
  await expect(page.locator('tbody tr', { hasText: '2016–17' })).toHaveCount(1);

  await page.goto('./#/fe/2025-26/eprix/Monaco%20ePrix');
  await expect(page.getByRole('heading', { name: 'Победители по годам' })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toContainText('Sébastien Buemi');
  expect(await page.evaluate(() => localStorage.getItem('racinghub:wec:favorites'))).toBeNull();
});

test('FE compares two drivers by season, as each article publishes them', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/fe/2025-26/compare?a=Pascal+Wehrlein&b=Mitch+Evans');
  await expect(page.locator('.fe-compare-metrics')).toHaveCount(2);
  await expect(page.locator('.fe-compare-metrics').first()).toContainText('Победы');
  const season = page.locator('.fe-compare-seasons tbody tr', { hasText: '2016–17' });
  await expect(season).toContainText('нет у источника');
  await page.getByRole('button', { name: 'Поменять пилотов местами' }).click();
  await expect(page).toHaveURL(/a=Mitch\+Evans&b=Pascal\+Wehrlein/);
});
