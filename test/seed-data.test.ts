import { describe, expect, it } from 'vitest';
import { ARTICLES, ARTICLE_CONTENT_TYPE, DRAFT_ARTICLES, PUBLISHED_ARTICLES, toFields } from '../src/seed-data';

describe('seed data', () => {
  it('has four entries and exactly one of them unpublished', () => {
    expect(ARTICLES).toHaveLength(4);
    expect(DRAFT_ARTICLES).toHaveLength(1);
    expect(PUBLISHED_ARTICLES).toHaveLength(3);
  });

  it('uses unique ids and slugs, and url-safe slugs', () => {
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(4);
    expect(new Set(ARTICLES.map((a) => a.slug)).size).toBe(4);
    for (const a of ARTICLES) expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('defines a field in the content type for every field it writes', () => {
    const defined = ARTICLE_CONTENT_TYPE.fields.map((f) => f.id).sort();
    expect(Object.keys(toFields(ARTICLES[0]!, 'en-US')).sort()).toEqual(defined);
  });

  it('puts every value under the given locale', () => {
    expect(toFields(ARTICLES[0]!, 'es-ES').title).toEqual({ 'es-ES': ARTICLES[0]!.title });
  });
});
