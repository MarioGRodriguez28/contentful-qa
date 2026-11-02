import { beforeAll, describe, expect, it } from 'vitest';
import { ARTICLES, DRAFT_ARTICLES, PUBLISHED_ARTICLES } from '../../src/seed-data';
import { listArticles, type EntryList } from '../support/delivery';
import { requireSeededSpace } from '../support/seeded';

const REQUIRED_FIELDS = ['title', 'slug', 'body', 'author', 'publishedDate'] as const;

describe('GET /entries?content_type=article', () => {
  let list: EntryList;
  let contentType = '';

  beforeAll(async () => {
    await requireSeededSpace();
    const res = await listArticles();
    list = res.data;
    contentType = String(res.headers['content-type']);
    expect(res.status).toBe(200);
  });

  it('answers with the Contentful delivery JSON media type', () => {
    expect(contentType).toMatch(/application\/vnd\.contentful\.delivery\.v1\+json/);
  });

  it('wraps the entries in the collection envelope', () => {
    expect(list.sys.type).toBe('Array');
    expect(list.skip).toBe(0);
    expect(list.limit).toBe(100);
    expect(typeof list.total).toBe('number');
    expect(Array.isArray(list.items)).toBe(true);
  });

  it('delivers exactly the published articles', () => {
    expect(list.total).toBe(PUBLISHED_ARTICLES.length);
    expect(list.items.map((e) => e.fields.slug).sort()).toEqual(PUBLISHED_ARTICLES.map((a) => a.slug).sort());
  });

  it('never delivers the unpublished draft', () => {
    for (const draft of DRAFT_ARTICLES) {
      expect(list.items.some((e) => e.sys.id === draft.id || e.fields.slug === draft.slug)).toBe(false);
    }
  });

  it.each(REQUIRED_FIELDS)('gives every entry a non-empty %s', (field) => {
    for (const entry of list.items) {
      expect(entry.fields[field], `entry ${entry.sys.id}`).toEqual(expect.any(String));
      expect(String(entry.fields[field]).trim().length).toBeGreaterThan(0);
    }
  });

  it('formats slug and published date as expected', () => {
    for (const entry of list.items) {
      expect(entry.fields.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.fields.publishedDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  it('describes each entry as an article entry with a published version', () => {
    for (const entry of list.items) {
      expect(entry.sys.type).toBe('Entry');
      expect(entry.sys.contentType.sys.id).toBe('article');
      expect(entry.sys.publishedVersion).toEqual(expect.any(Number));
    }
  });

  it('returns each field exactly as it was seeded', () => {
    for (const article of PUBLISHED_ARTICLES) {
      const entry = list.items.find((e) => e.sys.id === article.id);
      expect(entry, article.id).toBeDefined();
      expect(entry?.fields).toMatchObject({ title: article.title, slug: article.slug, body: article.body, author: article.author });
      expect(String(entry?.fields.publishedDate).startsWith(article.publishedDate)).toBe(true);
    }
  });

  it('knows about every seeded article id (published and draft) only through the published ones', () => {
    const delivered = new Set(list.items.map((e) => e.sys.id));
    expect(ARTICLES.filter((a) => delivered.has(a.id)).map((a) => a.id).sort()).toEqual(PUBLISHED_ARTICLES.map((a) => a.id).sort());
  });
});
