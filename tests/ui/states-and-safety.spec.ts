import { expect, test } from '@playwright/test';
import { CONTENTFUL_API } from './support';

const collection = (items: unknown[]) => JSON.stringify({ sys: { type: 'Array' }, total: items.length, skip: 0, limit: 100, items });

test.describe('when the API misbehaves', () => {
  test('shows an error message if the request fails', async ({ page }) => {
    await page.route(CONTENTFUL_API, (route) => route.abort('connectionrefused'));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Could not load articles');
    await expect(page.getByTestId('article-card')).toHaveCount(0);
  });

  for (const status of [401, 429, 500]) {
    test(`shows an error message for a ${status} answer`, async ({ page }) => {
      await page.route(CONTENTFUL_API, (route) => route.fulfill({ status, contentType: 'application/json', body: '{}' }));
      await page.goto('/');
      await expect(page.getByRole('alert')).toContainText('Could not load articles');
    });
  }

  test('says there are no articles when the list is empty', async ({ page }) => {
    await page.route(CONTENTFUL_API, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: collection([]) }));
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('No articles yet.');
  });

  test('recovers when the address changes after a failure', async ({ page }) => {
    let failing = true;
    await page.route(CONTENTFUL_API, (route) => (failing ? route.fulfill({ status: 500, body: '{}' }) : route.continue()));
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
    failing = false;
    await page.goto('/#/');
    await page.reload();
    await expect(page.getByTestId('article-card').first()).toBeVisible();
  });
});

test.describe('content is shown as text, never as markup', () => {
  test('does not run HTML or scripts that come inside the API data', async ({ page }) => {
    const hostile = { title: '<img src=x onerror="window.__xss = 1">', slug: 'hostile', body: '<script>window.__xss = 1</script> text', author: '<b>Mallory</b>', publishedDate: '2026-10-01' };
    await page.route(CONTENTFUL_API, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: collection([{ sys: { id: 'x' }, fields: hostile }]) }));
    await page.goto('/');
    await expect(page.getByTestId('article-card')).toContainText('<img src=x');
    await expect(page.getByTestId('article-card').locator('img, b, script')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });
});
