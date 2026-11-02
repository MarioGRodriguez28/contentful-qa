import { beforeAll, describe, expect, it } from 'vitest';
import { DRAFT_ARTICLES, PUBLISHED_ARTICLES } from '../../src/seed-data';
import { requireSeededSpace } from '../support/seeded';
import { articles, errorCode, graphql } from '../support/graphql';

const byDate = [...PUBLISHED_ARTICLES].sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
const slugs = (c: { items: Record<string, unknown>[] }) => c.items.map((i) => i.slug);

describe('where filters', () => {
  beforeAll(requireSeededSpace);

  it('filters by exact slug', async () => {
    const target = PUBLISHED_ARTICLES[1]!;
    const c = await articles(`where: { slug: "${target.slug}" }`);
    expect(c.total).toBe(1);
    expect(slugs(c)).toEqual([target.slug]);
  });

  it('returns an empty collection, not an error, when nothing matches', async () => {
    const c = await articles('where: { slug: "no-such-article" }');
    expect(c).toMatchObject({ total: 0, items: [] });
  });

  it('filters by a list with slug_in', async () => {
    const wanted = [PUBLISHED_ARTICLES[0]!.slug, PUBLISHED_ARTICLES[2]!.slug];
    const c = await articles(`where: { slug_in: ${JSON.stringify(wanted)} }`);
    expect(slugs(c).sort()).toEqual([...wanted].sort());
  });

  it('filters by text with title_contains', async () => {
    expect(slugs(await articles('where: { title_contains: "mobile" }'))).toEqual(['testing-on-mobile-viewports']);
  });

  it('excludes a value with slug_not', async () => {
    const excluded = PUBLISHED_ARTICLES[0]!.slug;
    const c = await articles(`where: { slug_not: "${excluded}" }`);
    expect(slugs(c)).not.toContain(excluded);
    expect(c.total).toBe(PUBLISHED_ARTICLES.length - 1);
  });

  it('filters dates with _gte and _lt', async () => {
    const cutoff = byDate[1]!.publishedDate;
    const later = await articles(`where: { publishedDate_gte: "${cutoff}" }`);
    const earlier = await articles(`where: { publishedDate_lt: "${cutoff}" }`);
    expect(slugs(later).sort()).toEqual(byDate.filter((a) => a.publishedDate >= cutoff).map((a) => a.slug).sort());
    expect(slugs(earlier)).toEqual([byDate[0]!.slug]);
  });

  it('combines conditions with AND and OR', async () => {
    const [a, b, c] = byDate;
    const or = await articles(`where: { OR: [{ slug: "${a!.slug}" }, { slug: "${c!.slug}" }] }`);
    const and = await articles(`where: { AND: [{ slug_in: ["${a!.slug}", "${b!.slug}"] }, { slug_not: "${a!.slug}" }] }`);
    expect(slugs(or).sort()).toEqual([a!.slug, c!.slug].sort());
    expect(slugs(and)).toEqual([b!.slug]);
  });

  it('filters by the existence of a field', async () => {
    expect((await articles('where: { author_exists: true }')).total).toBe(PUBLISHED_ARTICLES.length);
    expect((await articles('where: { author_exists: false }')).total).toBe(0);
  });
});

describe('ordering and paging', () => {
  beforeAll(requireSeededSpace);

  it('orders by date ascending and descending', async () => {
    const asc = await articles('order: publishedDate_ASC');
    const desc = await articles('order: publishedDate_DESC');
    expect(slugs(asc)).toEqual(byDate.map((a) => a.slug));
    expect(slugs(desc)).toEqual([...byDate].reverse().map((a) => a.slug));
  });

  it('limits the page size but keeps the total', async () => {
    const c = await articles('limit: 2, order: publishedDate_ASC');
    expect(c.items).toHaveLength(2);
    expect(c.total).toBe(PUBLISHED_ARTICLES.length);
    expect(c.limit).toBe(2);
  });

  it('pages without overlap or gaps', async () => {
    const first = await articles('limit: 2, skip: 0, order: publishedDate_ASC');
    const second = await articles('limit: 2, skip: 2, order: publishedDate_ASC');
    expect(second.skip).toBe(2);
    expect([...slugs(first), ...slugs(second)]).toEqual(byDate.map((a) => a.slug));
  });

  it('returns an empty page when skipping past the end', async () => {
    const c = await articles('skip: 50');
    expect(c.items).toEqual([]);
  });
});

describe('drafts are not delivered', () => {
  beforeAll(requireSeededSpace);

  it.each(DRAFT_ARTICLES.map((a) => [a.slug, a] as const))('returns null, without an error, for the draft %s by id', async (_slug, draft) => {
    const res = await graphql<{ article: unknown }>(`{ article(id: "${draft.id}") { title } }`);
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data).toEqual({ article: null });
  });

  it.each(DRAFT_ARTICLES.map((a) => [a.slug, a] as const))('finds nothing when filtering by the draft slug %s', async (_slug, draft) => {
    expect((await articles(`where: { slug: "${draft.slug}" }`)).total).toBe(0);
  });

  it('answers null for an id that does not exist, the same way as for a draft', async () => {
    const res = await graphql<{ article: unknown }>('{ article(id: "no-such-id") { title } }');
    expect(res.body.data).toEqual({ article: null });
  });

  it('refuses preview content to a delivery token', async () => {
    const res = await graphql('{ articleCollection(preview: true) { total } }');
    expect(res.body.errors?.length).toBeGreaterThan(0);
    expect(errorCode(res)).toBe('ACCESS_TOKEN_INVALID');
  });
});
