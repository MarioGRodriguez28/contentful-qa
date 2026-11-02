import { beforeAll, describe, expect, it } from 'vitest';
import { config } from '../support/delivery';
import { requireSeededSpace } from '../support/seeded';
import { GRAPHQL_URL, errorCode, graphql } from '../support/graphql';

describe('invalid queries', () => {
  it('rejects a syntax error with 400 and an errors list', async () => {
    const res = await graphql('{ articleCollection { items { slug } ');
    expect(res.status).toBe(400);
    expect(res.body.errors?.[0]?.message).toMatch(/Syntax Error/);
    expect(res.body.data).toBeUndefined();
  });

  it('rejects an empty query', async () => {
    const res = await graphql('');
    expect(res.status).toBe(400);
    expect(res.body.errors?.length).toBeGreaterThan(0);
  });

  it('rejects a field that does not exist, naming the field and the type', async () => {
    const res = await graphql('{ articleCollection { items { nope } } }');
    expect(res.status).toBe(400);
    expect(res.body.errors?.[0]?.message).toContain('Cannot query field "nope" on type "Article"');
  });

  it('rejects a root field that does not exist', async () => {
    const res = await graphql('{ nope { x } }');
    expect(res.status).toBe(400);
    expect(res.body.errors?.[0]?.message).toContain('Cannot query field "nope" on type "Query"');
  });

  it('rejects an argument of the wrong type', async () => {
    const res = await graphql('{ articleCollection(limit: "two") { total } }');
    expect(res.status).toBe(400);
    expect(res.body.errors?.[0]?.message).toContain('Argument "limit" has invalid value');
  });

  it('rejects a missing required variable', async () => {
    const res = await graphql('query ($slug: String!) { articleCollection(where: { slug: $slug }) { total } }', {});
    expect(res.status).toBe(400);
    expect(res.body.errors?.[0]?.message).toContain('"$slug"');
  });

  it('always returns errors as objects with a text message', async () => {
    const answers = [await graphql('{ nope }'), await graphql('{ articleCollection { items { nope } } }'), await graphql('')];
    for (const res of answers) {
      for (const error of res.body.errors ?? []) expect(error.message).toEqual(expect.any(String));
    }
  });
});

describe('authentication and addressing', () => {
  it('answers 401 ACCESS_TOKEN_MISSING when no token is sent', async () => {
    const res = await graphql('{ articleCollection { total } }', undefined, { token: null });
    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe('ACCESS_TOKEN_MISSING');
  });

  it('answers 401 ACCESS_TOKEN_INVALID for a token that does not exist', async () => {
    const res = await graphql('{ articleCollection { total } }', undefined, { token: 'not-a-real-token' });
    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe('ACCESS_TOKEN_INVALID');
  });

  it('does not leak the real token in an error body', async () => {
    const res = await graphql('{ articleCollection { total } }', undefined, { token: 'not-a-real-token' });
    expect(JSON.stringify(res.body)).not.toContain(config.cdaToken);
  });

  it('answers UNKNOWN_SPACE for a space that does not exist', async () => {
    const res = await graphql('{ articleCollection { total } }', undefined, { url: 'https://graphql.contentful.com/content/v1/spaces/zzzzzzzzzzzz/environments/master' });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe('UNKNOWN_SPACE');
  });

  it('answers UNKNOWN_ENVIRONMENT for an environment that does not exist', async () => {
    const res = await graphql('{ articleCollection { total } }', undefined, { url: GRAPHQL_URL.replace(/environments\/.*$/, 'environments/does-not-exist') });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe('UNKNOWN_ENVIRONMENT');
  });
});

// A smoke threshold, not a service level: loose on purpose so it does not flake.
describe('response time', () => {
  beforeAll(requireSeededSpace);

  it('lists articles with a median under 1500 ms over five requests', async () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i += 1) times.push((await graphql('{ articleCollection { total items { slug title } } }')).ms);
    const median = [...times].sort((a, b) => a - b)[2]!;
    expect(median).toBeLessThan(1500);
    expect(Math.max(...times)).toBeLessThan(5000);
  });
});
