import { env } from 'node:process';
import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures';

// Opt-in: `npm run test:visual` (see playwright.visual.config.ts).

const ROUTES = [
  './',
  './#/wec/2026',
  './#/wec/2026/calendar',
  './#/wec/2026/race/3',
  './#/wec/2026/standings',
  './#/2026',
  './#/2026/calendar',
  './#/2026/race/1',
  './#/2026/drivers',
  './#/2026/constructors',
  './#/2026/chart',
  './#/2026/driver/russell',
  './#/2026/constructor/mercedes',
  './#/2026/circuit/c1',
  './#/about',
  './#/2026/compare?a=russell&b=max_verstappen',
  './#/wec/2026/drivers',
  './#/wec/2026/teams',
  './#/wec/2026/driver/S%C3%A9bastien%20Buemi',
  './#/wec/2026/team/Toyota%20Racing%20GmbH',
  './#/wec/2026/circuit/6%20Hours%20of%20Spa-Francorchamps?circuit=Circuit%20de%20Spa-Francorchamps',
  './#/wec/2026/compare?a=S%C3%A9bastien+Buemi&b=Kamui+Kobayashi',
  './#/wec/2026/about',
];

const DOC_SHOTS: Record<string, string> = {
  './': 'choose',
  './#/2026': 'home',
  './#/2026/calendar': 'calendar',
  './#/2026/chart': 'chart',
  './#/2026/race/1': 'f1-race',
  './#/wec/2026': 'wec-home',
  './#/wec/2026/calendar': 'wec-calendar',
  './#/wec/2026/standings': 'wec-chart',
  './#/wec/2026/circuit/6%20Hours%20of%20Spa-Francorchamps?circuit=Circuit%20de%20Spa-Francorchamps':
    'wec-circuit',
};

const onlyRoutes = env.VISUAL_ROUTES?.split(',');
const unknown = onlyRoutes?.filter((route) => !ROUTES.includes(route));
if (unknown?.length) throw new Error(`VISUAL_ROUTES: unknown ${unknown.join(', ')}`);

// One test per page and width, so Playwright shoots them in parallel workers.
for (const width of [1280, 375]) {
  for (const route of ROUTES.filter((route) => !onlyRoutes || onlyRoutes.includes(route))) {
    test(`w${width} ${route}`, async ({ page }) => {
      test.setTimeout(90_000);
      // The site drops its entrance animations for reduced motion: screenshots stay stable.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockApi(page, undefined, { localFlags: true });
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      await page.goto(route);
      await page.locator('main h1').waitFor();
      await page.waitForLoadState('networkidle');
      // skeletons are replaced by content; wait for them to go away before shooting
      await page
        .locator('.skeleton')
        .first()
        .waitFor({ state: 'detached' })
        .catch(() => {});
      // Photos arrive after the page itself: wait until each one is shown (or gone).
      await page.waitForFunction(() => !document.querySelector('figure.photo:not(.is-loaded)'));
      // Fonts, flags and team logos must be in place before the shot.
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((img) => {
            img.loading = 'eager'; // lazy images below the fold would never load otherwise
            if (img.complete) return null;
            return new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            });
          }),
        );
      });
      expect(
        await page
          .locator('img.flag')
          .evaluateAll((flags) =>
            flags.every((flag) => flag instanceof HTMLImageElement && flag.complete && flag.naturalWidth > 0),
          ),
      ).toBe(true);
      await page.waitForTimeout(1200);
      if (env.CAPTURE_DOCS === '1') {
        const name = DOC_SHOTS[route];
        if (name && (width === 1280 || name === 'wec-home')) {
          const target =
            name === 'wec-chart'
              ? page.locator('.wec-places-card')
              : name === 'wec-circuit'
                ? page.locator('.wec-circuit-panel')
                : page;
          await target.screenshot({
            path: `docs/screenshots/${name}${width === 375 ? '-mobile' : ''}.png`,
            animations: 'disabled',
          });
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      }
      await expect(page).toHaveScreenshot(`w${width}${route.replace(/[^a-z0-9]+/gi, '-')}.png`, {
        // Long career tables exceed reliable full-page capture on Windows Chromium.
        // Their rows are covered by parser/E2E checks; capture the profile's first screen.
        fullPage: !/\/wec\/[^/]+\/(driver|team|circuit)\//.test(route),
        animations: 'disabled',
        timeout: 20_000,
        // Chromium sometimes lays out the narrow pages 1–2 px apart (sub-pixel rounding), which
        // shifts a few thin lines by ~50 pixels in total; a real layout change differs by far more.
        // The long WEC race table also varies at inline text/badge edges on Windows (measured: 1,755 px).
        maxDiffPixels: /\/wec\/[^/]+\/race\//.test(route) ? 2000 : 100,
      });
    });
  }
}
