import { beforeAll, describe, expect, it } from 'vitest';
import { ARTICLE_CONTENT_TYPE } from '../../src/seed-data';
import { deliver, listArticles } from '../support/delivery';
import { requireSeededSpace } from '../support/seeded';

interface FieldDefinition {
  id: string;
  type: string;
  required: boolean;
}
interface ContentType {
  sys: { type: string; id: string };
  displayField: string;
  fields: FieldDefinition[];
}

describe('GET /content_types/article', () => {
  let contentType: ContentType;

  beforeAll(async () => {
    const res = await deliver<ContentType>('/content_types/article');
    expect(res.status).toBe(200);
    contentType = res.data;
  });

  it('is a content type with the expected id and display field', () => {
    expect(contentType.sys).toMatchObject({ type: 'ContentType', id: 'article' });
    expect(contentType.displayField).toBe('title');
  });

  it('defines the five fields with the right types and required flags', () => {
    const actual = contentType.fields.map(({ id, type, required }) => ({ id, type, required }));
    const expected = ARTICLE_CONTENT_TYPE.fields.map(({ id, type, required }) => ({ id, type, required }));
    expect(actual).toEqual(expected);
  });
});

// A smoke threshold for a CDN-backed read, not a service level: it is loose on purpose so it does not flake.
describe('response time', () => {
  beforeAll(requireSeededSpace);

  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

  it('lists articles with a median under 1500 ms over five requests', async () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i += 1) times.push((await listArticles()).ms);
    expect(median(times)).toBeLessThan(1500);
    expect(Math.max(...times)).toBeLessThan(5000);
  });

  it('answers a single entry under 2000 ms', async () => {
    const res = await deliver('/entries/seed-api-testing-basics');
    expect(res.ms).toBeLessThan(2000);
  });
});
