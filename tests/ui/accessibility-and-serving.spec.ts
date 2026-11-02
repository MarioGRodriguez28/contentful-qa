import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { config } from '../support/delivery';
import { NEWEST_FIRST } from './support';

const seriousViolations = async (page: import('@playwright/test').Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
};

test.describe('accessibility', () => {
  test('the list has no serious or critical violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('article-card')).toHaveCount(NEWEST_FIRST.length);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the detail page has no serious or critical violations', async ({ page }) => {
    await page.goto(`/#/article/${NEWEST_FIRST[0]!.slug}`);
    await expect(page.getByTestId('article-detail')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('moves the focus to the heading when the page changes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: NEWEST_FIRST[0]!.title }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });
});

// These check the small server, so one run is enough: they do not depend on the browser or the screen size.
test.describe('what the page server sends', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'same for every project, so it runs once on desktop Chromium');

  test('hands the page only the read-only delivery token, never the management token', async ({ request }) => {
    const body = await (await request.get('/config.js')).text();
    expect(body).toContain(config.cdaToken);
    expect(body).not.toContain(config.cmaToken);
  });

  test('sends security headers and does not cache the config', async ({ request }) => {
    const res = await request.get('/config.js');
    expect(res.headers()['cache-control']).toBe('no-store');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
  });

  test('serves only its own files', async ({ request }) => {
    for (const path of ['/package.json', '/.env', '/%2e%2e/package.json', '/src/config.ts']) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test('refuses requests that are not GET', async ({ request }) => {
    expect((await request.post('/')).status()).toBe(405);
  });
});
