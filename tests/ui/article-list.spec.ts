import { expect, test } from '@playwright/test';
import { DRAFT, NEWEST_FIRST, formatDate } from './support';

test.describe('article list', () => {
  test('has a page title and a main heading', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Articles');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Articles');
  });

  test('lists the published articles, newest first', async ({ page }) => {
    await page.goto('/');
    const titles = page.getByTestId('article-card').getByRole('heading', { level: 2 });
    await expect(titles).toHaveText(NEWEST_FIRST.map((a) => a.title));
  });

  test('shows the author and the date on every card', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('article-card');
    await expect(cards).toHaveCount(NEWEST_FIRST.length);
    for (const [index, article] of NEWEST_FIRST.entries()) {
      const card = cards.nth(index);
      await expect(card).toContainText(article.author);
      await expect(card.locator('time')).toHaveAttribute('datetime', article.publishedDate);
      await expect(card.locator('time')).toHaveText(formatDate(article.publishedDate));
    }
  });

  test('does not show the unpublished draft anywhere', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('article-card')).toHaveCount(NEWEST_FIRST.length);
    await expect(page.getByText(DRAFT.title)).toHaveCount(0);
    expect(await page.content()).not.toContain(DRAFT.slug);
  });

  test('links every card to its own article', async ({ page }) => {
    await page.goto('/');
    for (const [index, article] of NEWEST_FIRST.entries()) {
      await expect(page.getByTestId('article-card').nth(index).getByRole('link')).toHaveAttribute('href', `#/article/${article.slug}`);
    }
  });

  test('reads from the Delivery API, asking only for articles', async ({ page }) => {
    const [request] = await Promise.all([page.waitForRequest((r) => r.url().includes('cdn.contentful.com') && r.url().includes('/entries')), page.goto('/')]);
    const url = new URL(request.url());
    expect(url.searchParams.get('content_type')).toBe('article');
    expect(request.headers()['authorization']).toMatch(/^Bearer .+/);
  });
});
