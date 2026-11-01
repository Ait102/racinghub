import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

const pair = './#/wec/2026/compare?a=S%C3%A9bastien+Buemi&b=Kamui+Kobayashi';

test('WEC comparison: choose drivers, preserve published points, swap and keep URL on season change', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('./#/wec/2026');
  await page.getByRole('link', { name: 'Сравнение', exact: true }).click();
  await page.getByRole('combobox', { name: 'Пилот 1', exact: true }).selectOption('Sébastien Buemi');
  await page.getByRole('combobox', { name: 'Пилот 2', exact: true }).selectOption('Kamui Kobayashi');
  const results = page.getByRole('table', { name: 'Итоги WEC по сезонам' });
  await expect(results).toContainText('106.25');
  await expect(results).toContainText('114*');
  await expect(results).toContainText('97*');
  await expect(results).toContainText('2018–19');
  const first = results.locator('tbody tr').first();
  await expect(first.locator('td').nth(1)).toContainText('114*');
  await page.getByRole('button', { name: 'Поменять пилотов местами' }).click();
  await expect(first.locator('td').nth(1)).toContainText('97*');
  await expect(page.getByRole('combobox', { name: 'Пилот 1', exact: true })).toHaveValue('Kamui Kobayashi');
  await page.getByRole('combobox', { name: 'Сезон', exact: true }).selectOption('2012');
  await expect(page).toHaveURL(/wec\/2012\/compare\?/);
  await expect(page.getByRole('combobox', { name: 'Пилот 1', exact: true })).toHaveValue('Kamui Kobayashi');
  await expect(results).toContainText('114*');
  await page.reload();
  await expect(results).toContainText('106.25');
});

test('WEC profile starts comparison with its driver already selected', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/driver/S%C3%A9bastien%20Buemi');
  await page.getByRole('link', { name: 'Сравнить с другим пилотом' }).click();
  await expect(page.getByRole('combobox', { name: 'Пилот 1', exact: true })).toHaveValue('Sébastien Buemi');
  await expect(page.getByText('Выберите двух пилотов, чтобы сравнить их карьеры.')).toBeVisible();
});

test('WEC comparison rejects identical or invalid choices without requesting profiles', async ({ page }) => {
  await mockApi(page);
  const profiles: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (
      u.searchParams.get('action') === 'parse' &&
      ['Sébastien Buemi', 'File:Example.jpg'].includes(u.searchParams.get('page') ?? '')
    )
      profiles.push(r.url());
  });
  await page.goto('./#/wec/2026/compare?a=S%C3%A9bastien+Buemi&b=S%C3%A9bastien+Buemi');
  await expect(page.getByText('Выберите двух разных пилотов.')).toBeVisible();
  await page.goto('./#/wec/2026/compare?a=File%3AExample.jpg&b=S%C3%A9bastien+Buemi');
  await expect(page.getByRole('alert')).toContainText('Недопустимое название статьи пилота');
  expect(profiles).toEqual([]);
  await page.goto('./#/wec/2026/compare?a=S%C3%A9bastien+Buemi&b=S%C3%A9bastien_Buemi');
  await expect(page.getByRole('alert')).toContainText('Обе ссылки ведут на одного пилота');
});

test('WEC comparison keeps missing history unknown and recovers only the failed side', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/wec/2026/compare?a=S%C3%A9bastien+Buemi&b=Tom+Gamble+(racing+driver)');
  const results = page.getByRole('table', { name: 'Итоги WEC по сезонам' });
  await expect(results).toContainText('нет у источника');
  const right = page.locator('.wec-compare-driver').nth(1);
  await expect(right).toContainText('Нет таблицы результатов WEC в статье.');
  await page.goto(pair.replace('b=Kamui+Kobayashi', 'b=Unknown_driver'));
  await expect(page.locator('.wec-compare-driver').first()).toContainText('Sébastien Buemi');
  await expect(page.locator('.wec-compare-driver').nth(1).getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Итоги WEC по сезонам' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Пилот 2', exact: true }).selectOption('Kamui Kobayashi');
  await expect(results).toContainText('97*');
});

test('WEC comparison fits mobile and supports keyboard selection', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(pair);
  await expect(page.getByRole('table', { name: 'Итоги WEC по сезонам' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const swap = page.getByRole('button', { name: 'Поменять пилотов местами' });
  await swap.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Пилот 1', exact: true })).toHaveValue('Kamui Kobayashi');
  await page.getByRole('link', { name: 'Kamui Kobayashi', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kamui Kobayashi');
});

test('WEC comparison retries a failed article without hiding the other career', async ({ page }) => {
  await mockApi(page);
  let down = true;
  await page.route('https://en.wikipedia.org/w/api.php**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (down && params.get('action') === 'parse' && params.get('page') === 'Kamui Kobayashi')
      return route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' });
    return route.fallback();
  });
  await page.goto(pair);
  const left = page.locator('.wec-compare-driver').first();
  const right = page.locator('.wec-compare-driver').nth(1);
  await expect(right.getByRole('alert')).toBeVisible({ timeout: 30_000 });
  await expect(left).toContainText('Sébastien Buemi');
  await expect(page.getByRole('table', { name: 'Итоги WEC по сезонам' })).toHaveCount(0);
  down = false;
  await right.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.getByRole('table', { name: 'Итоги WEC по сезонам' })).toContainText('97*');
});
