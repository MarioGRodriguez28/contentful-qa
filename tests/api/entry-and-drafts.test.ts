import { beforeAll, describe, expect, it } from 'vitest';
import { DRAFT_ARTICLES, PUBLISHED_ARTICLES } from '../../src/seed-data';
import { deliver, listArticles, type ApiError, type Entry } from '../support/delivery';
import { requireSeededSpace } from '../support/seeded';

describe('GET /entries/{id}', () => {
  beforeAll(requireSeededSpace);

  it.each(PUBLISHED_ARTICLES.map((a) => [a.slug, a] as const))('returns the published entry %s', async (_slug, article) => {
    const res = await deliver<Entry>(`/entries/${article.id}`);
    expect(res.status).toBe(200);
    expect(res.data.sys.id).toBe(article.id);
    expect(res.data.fields).toMatchObject({ title: article.title, slug: article.slug, author: article.author });
  });

  it.each(DRAFT_ARTICLES.map((a) => [a.slug, a] as const))('answers 404 NotFound for the unpublished draft %s', async (_slug, draft) => {
    const res = await deliver<ApiError>(`/entries/${draft.id}`);
    expect(res.status).toBe(404);
    expect(res.data.sys).toEqual({ type: 'Error', id: 'NotFound' });
    expect(res.data.message).toEqual(expect.any(String));
  });

  it('answers 404 NotFound for an id that does not exist', async () => {
    const res = await deliver<ApiError>('/entries/this-id-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.data.sys.id).toBe('NotFound');
  });
});

describe('drafts in queries', () => {
  beforeAll(requireSeededSpace);

  it.each(DRAFT_ARTICLES.map((a) => [a.slug, a] as const))('finds nothing when filtering by the draft slug %s', async (_slug, draft) => {
    const res = await listArticles({ 'fields.slug': draft.slug });
    expect(res.status).toBe(200);
    expect(res.data.total).toBe(0);
    expect(res.data.items).toEqual([]);
  });

  it.each(DRAFT_ARTICLES.map((a) => [a.slug, a] as const))('finds nothing when filtering by the draft id %s', async (_slug, draft) => {
    const res = await listArticles({ 'sys.id': draft.id });
    expect(res.status).toBe(200);
    expect(res.data.total).toBe(0);
  });

  it('does not count the draft in the total', async () => {
    const res = await listArticles({ limit: 1 });
    expect(res.data.total).toBe(PUBLISHED_ARTICLES.length);
  });
});
