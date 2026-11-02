import { beforeAll, describe, expect, it } from 'vitest';
import { PUBLISHED_ARTICLES } from '../../src/seed-data';
import { listArticles } from '../support/delivery';
import { requireSeededSpace } from '../support/seeded';

const byDate = [...PUBLISHED_ARTICLES].sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
const slugs = (items: { fields: Record<string, unknown> }[]) => items.map((e) => e.fields.slug);

describe('filtering', () => {
  beforeAll(requireSeededSpace);

  it('filters by exact slug', async () => {
    const target = PUBLISHED_ARTICLES[1]!;
    const res = await listArticles({ 'fields.slug': target.slug });
    expect(res.status).toBe(200);
    expect(res.data.total).toBe(1);
    expect(res.data.items[0]?.sys.id).toBe(target.id);
  });

  it('returns an empty collection, not an error, when nothing matches', async () => {
    const res = await listArticles({ 'fields.slug': 'no-such-article' });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ total: 0, items: [] });
  });

  it('filters by author', async () => {
    const res = await listArticles({ 'fields.author': 'Mario Rodriguez' });
    expect(res.data.total).toBe(PUBLISHED_ARTICLES.length);
  });

  it('filters by date with the [gte] operator', async () => {
    const cutoff = byDate[1]!.publishedDate;
    const expected = byDate.filter((a) => a.publishedDate >= cutoff).map((a) => a.slug);
    const res = await listArticles({ 'fields.publishedDate[gte]': cutoff });
    expect(slugs(res.data.items).sort()).toEqual(expected.sort());
  });

  it('filters by a list of values with the [in] operator', async () => {
    const wanted = [PUBLISHED_ARTICLES[0]!.slug, PUBLISHED_ARTICLES[2]!.slug];
    const res = await listArticles({ 'fields.slug[in]': wanted.join(',') });
    expect(slugs(res.data.items).sort()).toEqual([...wanted].sort());
  });

  it('matches text with the [match] operator', async () => {
    const res = await listArticles({ 'fields.title[match]': 'mobile' });
    expect(slugs(res.data.items)).toEqual(['testing-on-mobile-viewports']);
  });
});

describe('selecting, ordering and paging', () => {
  beforeAll(requireSeededSpace);

  it('returns only the selected field, and no sys unless it is selected too', async () => {
    const res = await listArticles({ select: 'fields.title' });
    for (const entry of res.data.items) {
      expect(Object.keys(entry)).toEqual(['fields']);
      expect(Object.keys(entry.fields)).toEqual(['title']);
    }
  });

  it('returns the selected sys property when it is asked for', async () => {
    const res = await listArticles({ select: 'sys.id,fields.title' });
    expect(res.data.items.map((e) => e.sys.id).sort()).toEqual(PUBLISHED_ARTICLES.map((a) => a.id).sort());
    for (const entry of res.data.items) expect(Object.keys(entry.fields)).toEqual(['title']);
  });

  it('orders by date ascending and descending', async () => {
    const asc = await listArticles({ order: 'fields.publishedDate' });
    const desc = await listArticles({ order: '-fields.publishedDate' });
    expect(slugs(asc.data.items)).toEqual(byDate.map((a) => a.slug));
    expect(slugs(desc.data.items)).toEqual([...byDate].reverse().map((a) => a.slug));
  });

  it('limits the page size but keeps the full total', async () => {
    const res = await listArticles({ limit: 2, order: 'fields.publishedDate' });
    expect(res.data.items).toHaveLength(2);
    expect(res.data.total).toBe(PUBLISHED_ARTICLES.length);
    expect(res.data.limit).toBe(2);
  });

  it('skips items, and two pages together cover the collection without overlap', async () => {
    const first = await listArticles({ limit: 2, skip: 0, order: 'fields.publishedDate' });
    const second = await listArticles({ limit: 2, skip: 2, order: 'fields.publishedDate' });
    expect(second.data.skip).toBe(2);
    expect(second.data.items).toHaveLength(PUBLISHED_ARTICLES.length - 2);
    expect([...slugs(first.data.items), ...slugs(second.data.items)]).toEqual(byDate.map((a) => a.slug));
  });

  it('returns an empty page, not an error, when skipping past the end', async () => {
    const res = await listArticles({ skip: 50 });
    expect(res.status).toBe(200);
    expect(res.data.items).toEqual([]);
    expect(res.data.skip).toBe(50);
  });
});
