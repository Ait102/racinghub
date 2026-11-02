import { expect, test } from '@playwright/test';

test('Formula E shell has its theme, honest placeholders and remembered season', async ({ page }) => {
  let wikiRequests = 0;
  await page.route('https://en.wikipedia.org/**', (route) => {
    wikiRequests++;
    return route.abort();
  });
  await page.goto('./');
  await page.getByRole('link', { name: /Formula E Электрические гонки/ }).click();
  const currentYear = new Date().getFullYear();
  await expect(page).toHaveURL(new RegExp(`#/fe/${currentYear}-`));
  await expect(page.locator('html')).toHaveAttribute('data-series', 'fe');
  await expect(page.locator('.fe-stage')).toContainText('пока не загружаются');
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2019-20');
  await page.getByRole('link', { name: 'Календарь', exact: true }).click();
  await expect(page).toHaveURL(/#\/fe\/2019-20\/calendar$/);
  await expect(page.getByRole('heading', { name: 'Календарь', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Источники', exact: true }).click();
  await expect(page.locator('main')).toContainText('2019–20 Formula E Championship');
  await expect(page.locator('footer')).toContainText('CC BY-SA 4.0');
  await page.goto('./#/fe');
  await expect(page).toHaveURL(/#\/fe\/2019-20$/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Сезон' })).toHaveValue('2019-20');
  expect(wikiRequests).toBe(0);
});

test('Formula E works on a phone and rejects invalid seasons', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./#/fe/2014-15/standings');
  await expect(page.getByRole('heading', { level: 1, name: 'Зачёты' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2020-21');
  await expect(page).toHaveURL(/#\/fe\/2020-21\/standings$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('./#/fe/2026-28');
  await expect(page.getByRole('heading', { name: 'Сезон не найден' })).toBeVisible();
});
