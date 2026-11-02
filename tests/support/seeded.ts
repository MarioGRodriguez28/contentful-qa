import { PUBLISHED_ARTICLES } from '../../src/seed-data';
import { listArticles } from './delivery';

// Fails fast with a clear message when the space has not been seeded, instead of many confusing failures.
export async function requireSeededSpace(): Promise<void> {
  const res = await listArticles({ limit: 1 });
  if (res.status !== 200 || res.data.total !== PUBLISHED_ARTICLES.length) {
    throw new Error(`The space is not seeded as expected (status ${res.status}, ${res.data?.total ?? '?'} published articles, expected ${PUBLISHED_ARTICLES.length}). Run "npm run seed" first.`);
  }
}
