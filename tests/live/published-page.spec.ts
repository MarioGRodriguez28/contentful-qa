import { expect, test } from '@playwright/test';
import { DRAFT, NEWEST_FIRST } from '../ui/support';

test.describe('the published page', () => {
  test('lists the published articles, newest first, without the draft', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('article-card').getByRole('heading', { level: 2 })).toHaveText(NEWEST_FIRST.map((a) => a.title));
    await expect(page.getByText(DRAFT.title)).toHaveCount(0);
  });

  test('opens an article and goes back', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('link', { name: NEWEST_FIRST[0]!.title }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(NEWEST_FIRST[0]!.title);
    await expect(page.getByTestId('article-detail')).toContainText(NEWEST_FIRST[0]!.body);
    await page.getByRole('link', { name: 'Back to articles' }).click();
    await expect(page.getByTestId('article-card')).toHaveCount(NEWEST_FIRST.length);
  });

  test('does not open the unpublished draft', async ({ page }) => {
    await page.goto(`./#/article/${DRAFT.slug}`);
    await expect(page.getByRole('status')).toHaveText('Article not found.');
  });

  test('loads without console errors or failed requests, talking only to its own host and Contentful', async ({ page, baseURL }) => {
    const problems: string[] = [];
    const hosts = new Set<string>();
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${new URL(r.url()).host}${new URL(r.url()).pathname}`));
    page.on('request', (r) => hosts.add(new URL(r.url()).host));
    await page.goto('./');
    await expect(page.getByTestId('article-card')).toHaveCount(NEWEST_FIRST.length);
    expect(problems).toEqual([]);
    expect([...hosts].sort()).toEqual([new URL(baseURL!).host, 'cdn.contentful.com'].sort());
  });

  test('declares a Content-Security-Policy and hands out only the read-only token', async ({ page, request }) => {
    await page.goto('./');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /default-src 'self'/);
    const body = await (await request.get('./config.js')).text();
    const handed = JSON.parse(body.replace(/^window\.CONTENTFUL = /, '').replace(/;$/, '')) as Record<string, string>;
    expect(Object.keys(handed).sort()).toEqual(['environment', 'spaceId', 'token']);
    expect(body).not.toContain('CFPAT-');
  });
});
