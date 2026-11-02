import { expect, test } from '@playwright/test';
import { DRAFT, NEWEST_FIRST, formatDate } from './support';

const target = NEWEST_FIRST[1]!;

test.describe('article detail', () => {
  test('opens from the list and shows the full article', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: target.title }).click();
    await expect(page).toHaveURL(new RegExp(`#/article/${target.slug}$`));
    const detail = page.getByTestId('article-detail');
    await expect(detail.getByRole('heading', { level: 1 })).toHaveText(target.title);
    await expect(detail).toContainText(target.author);
    await expect(detail.locator('time')).toHaveText(formatDate(target.publishedDate));
    await expect(detail).toContainText(target.body);
  });

  test('can be opened directly from its address', async ({ page }) => {
    await page.goto(`/#/article/${target.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.title);
  });

  test('goes back to the list with the back link', async ({ page }) => {
    await page.goto(`/#/article/${target.slug}`);
    await page.getByRole('link', { name: 'Back to articles' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Articles');
    await expect(page.getByTestId('article-card')).toHaveCount(NEWEST_FIRST.length);
  });

  test('says the article was not found for an unknown address', async ({ page }) => {
    await page.goto('/#/article/this-article-does-not-exist');
    await expect(page.getByRole('status')).toHaveText('Article not found.');
    await expect(page.getByTestId('article-detail')).toHaveCount(0);
  });

  test('does not open the unpublished draft, even from its exact address', async ({ page }) => {
    await page.goto(`/#/article/${DRAFT.slug}`);
    await expect(page.getByRole('status')).toHaveText('Article not found.');
    await expect(page.getByText(DRAFT.body)).toHaveCount(0);
  });

  test('keeps working when the address has an odd slug', async ({ page }) => {
    await page.goto('/#/article/%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    await expect(page.getByRole('status')).toHaveText('Article not found.');
  });
});
