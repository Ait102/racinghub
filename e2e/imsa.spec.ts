import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

test('IMSA season: class winners, race classification and class standings', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#/imsa/2026');
  await expect(page.locator('html')).toHaveAttribute('data-series', 'imsa');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IMSA 2026');
  await expect(page.getByRole('article', { name: 'Лидеры классов' })).toContainText('GTD Pro');

  await page.getByRole('link', { name: 'Календарь', exact: true }).click();
  await expect(page.locator('.race-card')).toHaveCount(11);
  await page.locator('.race-card').first().click();
  await expect(page).toHaveURL(/#\/imsa\/2026\/race\/1$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rolex 24 at Daytona');
  const protocol = page.getByRole('table', { name: 'Протокол гонки' });
  await expect(protocol.locator('tbody tr')).toHaveCount(60);
  await page.getByRole('group', { name: 'Класс' }).getByRole('button', { name: 'LMP2', exact: true }).click();
  await expect(protocol.locator('tbody tr').first()).toContainText('Crowdstrike Racing by APR');

  await page.getByRole('link', { name: 'Зачёты', exact: true }).click();
  await page
    .getByRole('group', { name: 'Класс GTD', exact: true })
    .getByRole('button', { name: 'Команды' })
    .click();
  await expect(page.getByRole('table', { name: 'Команды · GTD' })).toContainText('#57 Winward Racing');

  // Older seasons keep their own classes.
  await page.getByRole('combobox', { name: 'Сезон' }).selectOption('2014');
  await expect(page).toHaveURL(/#\/imsa\/2014\/standings/);
  await expect(page.getByRole('group', { name: 'Класс PC' })).toBeVisible();
  await expect(page.locator('footer')).toContainText('CC BY-SA 4.0');
});
