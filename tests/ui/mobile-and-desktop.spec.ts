import { expect, test } from '@playwright/test';
import { NEWEST_FIRST } from './support';

test.describe('phone emulation', () => {
  test.skip(({ isMobile }) => !isMobile, 'only runs in the phone projects');

  test('has touch support and a phone-sized viewport', async ({ page, hasTouch }) => {
    await page.goto('/');
    expect(hasTouch).toBe(true);
    expect(page.viewportSize()!.width).toBeLessThan(500);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
  });

  test('does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('article-card')).toHaveCount(NEWEST_FIRST.length);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('uses the full width for each card', async ({ page }) => {
    await page.goto('/');
    const box = (await page.getByTestId('article-card').first().boundingBox())!;
    expect(box.width).toBeGreaterThan(page.viewportSize()!.width * 0.85);
  });

  test('keeps every link big enough to tap', async ({ page }) => {
    await page.goto('/');
    for (const link of await page.getByTestId('article-card').getByRole('link').all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('opens an article with a tap', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: NEWEST_FIRST[0]!.title }).tap();
    await expect(page.getByTestId('article-detail')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(NEWEST_FIRST[0]!.title);
  });
});

test.describe('desktop layout', () => {
  test.skip(({ isMobile }) => isMobile, 'only runs in the desktop project');

  test('keeps the article text at a readable width', async ({ page }) => {
    await page.goto(`/#/article/${NEWEST_FIRST[0]!.slug}`);
    const box = (await page.getByTestId('article-detail').locator('.body').boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(700);
  });

  test('uses the wide column for the list', async ({ page }) => {
    await page.goto('/');
    const box = (await page.locator('main').boundingBox())!;
    expect(box.width).toBeGreaterThan(900);
  });
});
