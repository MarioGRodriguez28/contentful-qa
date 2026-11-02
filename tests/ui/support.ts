import { DRAFT_ARTICLES, PUBLISHED_ARTICLES } from '../../src/seed-data';

export const NEWEST_FIRST = [...PUBLISHED_ARTICLES].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
export const DRAFT = DRAFT_ARTICLES[0]!;

// Same formatting the page uses, so the tests check what a visitor reads.
export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const CONTENTFUL_API = 'https://cdn.contentful.com/**';
