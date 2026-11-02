import axios from 'axios';
import { beforeAll, describe, expect, it } from 'vitest';
import { PUBLISHED_ARTICLES } from '../../src/seed-data';
import { requireSeededSpace } from '../support/seeded';
import { GRAPHQL_URL, graphql, type ArticleItem, type Collection } from '../support/graphql';
import { config } from '../support/delivery';

const ALL_FIELDS = 'sys { id publishedVersion } title slug body author publishedDate';

describe('valid queries', () => {
  beforeAll(requireSeededSpace);

  it('lists the published articles with every field', async () => {
    const res = await graphql<{ articleCollection: Collection<ArticleItem> }>(`{ articleCollection { total skip limit items { ${ALL_FIELDS} } } }`);
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const collection = res.body.data!.articleCollection;
    expect(collection).toMatchObject({ total: PUBLISHED_ARTICLES.length, skip: 0, limit: 100 });
    expect(collection.items.map((i) => i.slug).sort()).toEqual(PUBLISHED_ARTICLES.map((a) => a.slug).sort());
  });

  it('returns each field exactly as it was seeded', async () => {
    const res = await graphql<{ articleCollection: Collection<ArticleItem> }>(`{ articleCollection { items { ${ALL_FIELDS} } } }`);
    for (const article of PUBLISHED_ARTICLES) {
      const item = res.body.data!.articleCollection.items.find((i) => i.sys.id === article.id);
      expect(item, article.id).toMatchObject({ title: article.title, slug: article.slug, body: article.body, author: article.author });
      expect(item?.publishedDate.startsWith(article.publishedDate)).toBe(true);
      expect(item?.sys.publishedVersion).toEqual(expect.any(Number));
    }
  });

  it('returns only the fields that were asked for', async () => {
    const res = await graphql<{ articleCollection: Collection<Record<string, unknown>> }>('{ articleCollection { items { slug } } }');
    for (const item of res.body.data!.articleCollection.items) expect(Object.keys(item)).toEqual(['slug']);
  });

  it('returns a single article by id', async () => {
    const target = PUBLISHED_ARTICLES[0]!;
    const res = await graphql<{ article: ArticleItem }>(`{ article(id: "${target.id}") { ${ALL_FIELDS} } }`);
    expect(res.body.data!.article).toMatchObject({ title: target.title, slug: target.slug, author: target.author });
  });

  it('supports aliases and several root fields in one request', async () => {
    const [a, b] = PUBLISHED_ARTICLES;
    const res = await graphql<Record<string, { title: string }>>(`{ first: article(id: "${a!.id}") { title } second: article(id: "${b!.id}") { title } }`);
    expect(res.body.data).toEqual({ first: { title: a!.title }, second: { title: b!.title } });
  });

  it('supports variables', async () => {
    const target = PUBLISHED_ARTICLES[2]!;
    const res = await graphql<{ articleCollection: Collection<{ title: string }> }>(
      'query ($slug: String) { articleCollection(where: { slug: $slug }) { total items { title } } }',
      { slug: target.slug },
    );
    expect(res.body.data!.articleCollection.total).toBe(1);
    expect(res.body.data!.articleCollection.items[0]?.title).toBe(target.title);
  });

  it('supports fragments', async () => {
    const res = await graphql<{ articleCollection: Collection<{ slug: string; author: string }> }>(
      'query { articleCollection { items { ...Short } } } fragment Short on Article { slug author }',
    );
    expect(res.body.errors).toBeUndefined();
    for (const item of res.body.data!.articleCollection.items) expect(Object.keys(item).sort()).toEqual(['author', 'slug']);
  });

  it('exposes the GraphQL type names', async () => {
    const res = await graphql<{ articleCollection: { __typename: string; items: { __typename: string }[] } }>('{ articleCollection { __typename items { __typename } } }');
    expect(res.body.data!.articleCollection.__typename).toBe('ArticleCollection');
    expect(res.body.data!.articleCollection.items.every((i) => i.__typename === 'Article')).toBe(true);
  });

  it('also answers a query sent as a GET query string', async () => {
    const res = await axios.get(GRAPHQL_URL, {
      params: { query: '{ articleCollection { total } }' },
      headers: { Authorization: `Bearer ${config.cdaToken}` },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.data.articleCollection.total).toBe(PUBLISHED_ARTICLES.length);
  });
});

describe('schema introspection', () => {
  type TypeInfo = { fields: { name: string; type: { kind: string; name: string | null; ofType: { name: string | null } | null } }[] };

  it('offers the article queries on the root type', async () => {
    const res = await graphql<{ __type: { fields: { name: string }[] } }>('{ __type(name: "Query") { fields { name } } }');
    const names = res.body.data!.__type.fields.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['article', 'articleCollection']));
  });

  it('describes the Article type with the five seeded fields', async () => {
    const res = await graphql<{ __type: TypeInfo }>('{ __type(name: "Article") { fields { name type { kind name ofType { name } } } } }');
    const names = res.body.data!.__type.fields.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['title', 'slug', 'body', 'author', 'publishedDate', 'sys']));
  });

  it('types the date field as a DateTime and the text fields as String', async () => {
    const res = await graphql<{ __type: TypeInfo }>('{ __type(name: "Article") { fields { name type { kind name ofType { name } } } } }');
    const typeName = (field: string) => {
      const t = res.body.data!.__type.fields.find((f) => f.name === field)!.type;
      return t.name ?? t.ofType?.name;
    };
    expect(typeName('publishedDate')).toBe('DateTime');
    for (const field of ['title', 'slug', 'body', 'author']) expect(typeName(field)).toBe('String');
  });
});
