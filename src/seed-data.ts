export const CONTENT_TYPE_ID = 'article';

export interface Article {
  id: string;
  title: string;
  slug: string;
  body: string;
  author: string;
  publishedDate: string;
  published: boolean;
}

// Fixed ids make the seed repeatable and let the tests know exactly what to expect.
export const ARTICLES: Article[] = [
  {
    id: 'seed-api-testing-basics',
    title: 'API testing basics',
    slug: 'api-testing-basics',
    body: 'Check the status code, the shape of the response and the fields that must always be there.',
    author: 'Mario Rodriguez',
    publishedDate: '2026-10-01',
    published: true,
  },
  {
    id: 'seed-contract-tests',
    title: 'Why contract tests matter',
    slug: 'why-contract-tests-matter',
    body: 'A contract test fails when a response changes shape, before a consumer notices.',
    author: 'Mario Rodriguez',
    publishedDate: '2026-10-08',
    published: true,
  },
  {
    id: 'seed-mobile-viewports',
    title: 'Testing on mobile viewports',
    slug: 'testing-on-mobile-viewports',
    body: 'Emulating a phone catches layout and tap-target problems that a desktop run never shows.',
    author: 'Mario Rodriguez',
    publishedDate: '2026-10-15',
    published: true,
  },
  {
    id: 'seed-unpublished-draft',
    title: 'Draft: next article',
    slug: 'draft-next-article',
    body: 'This entry stays unpublished on purpose, so the tests can check that drafts are not delivered.',
    author: 'Mario Rodriguez',
    publishedDate: '2026-10-22',
    published: false,
  },
];

export const PUBLISHED_ARTICLES = ARTICLES.filter((a) => a.published);
export const DRAFT_ARTICLES = ARTICLES.filter((a) => !a.published);

export const ARTICLE_CONTENT_TYPE = {
  name: 'Article',
  displayField: 'title',
  fields: [
    { id: 'title', name: 'Title', type: 'Symbol', required: true, localized: false },
    { id: 'slug', name: 'Slug', type: 'Symbol', required: true, localized: false, validations: [{ unique: true }] },
    { id: 'body', name: 'Body', type: 'Text', required: true, localized: false },
    { id: 'author', name: 'Author', type: 'Symbol', required: true, localized: false },
    { id: 'publishedDate', name: 'Published date', type: 'Date', required: true, localized: false },
  ],
};

export function toFields(article: Article, locale: string): Record<string, Record<string, string>> {
  return {
    title: { [locale]: article.title },
    slug: { [locale]: article.slug },
    body: { [locale]: article.body },
    author: { [locale]: article.author },
    publishedDate: { [locale]: article.publishedDate },
  };
}
