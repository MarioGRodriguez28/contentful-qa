import { describe, expect, it } from 'vitest';
import { config, deliver, listArticles, type ApiError } from '../support/delivery';

const errorId = (res: { data: unknown }) => (res.data as ApiError).sys.id;

describe('authentication', () => {
  it('answers 401 AccessTokenInvalid for a token that does not exist', async () => {
    const res = await deliver<ApiError>('/entries', { content_type: 'article' }, { token: 'not-a-real-token' });
    expect(res.status).toBe(401);
    expect(res.data.sys).toEqual({ type: 'Error', id: 'AccessTokenInvalid' });
  });

  it('answers 401 when no token is sent, and says one is required', async () => {
    const res = await deliver<ApiError>('/entries', { content_type: 'article' }, { token: null });
    expect(res.status).toBe(401);
    expect(res.data.message).toMatch(/access token is required/i);
  });

  it('does not leak the real token in the error body', async () => {
    const res = await deliver<ApiError>('/entries', {}, { token: 'not-a-real-token' });
    expect(JSON.stringify(res.data)).not.toContain(config.cdaToken);
  });
});

describe('resources that do not exist', () => {
  it('answers 404 NotFound for an unknown space', async () => {
    const res = await deliver('/entries', {}, { basePath: '/spaces/zzzzzzzzzzzz/environments/master' });
    expect(res.status).toBe(404);
    expect(errorId(res)).toBe('NotFound');
  });

  it('answers 404 NotFound for an unknown environment', async () => {
    const res = await deliver('/entries', { content_type: 'article' }, { basePath: `/spaces/${config.spaceId}/environments/does-not-exist` });
    expect(res.status).toBe(404);
  });

  it('answers 404 NotFound for an unknown content type', async () => {
    const res = await deliver('/content_types/not-a-type');
    expect(res.status).toBe(404);
  });
});

describe('invalid queries', () => {
  it('answers 400 InvalidQuery for a limit above the maximum', async () => {
    const res = await listArticles({ limit: 5000 });
    expect(res.status).toBe(400);
    expect(errorId(res)).toBe('InvalidQuery');
  });

  it('answers 400 InvalidQuery for an unknown content type in the filter', async () => {
    const res = await deliver('/entries', { content_type: 'no-such-type' });
    expect(res.status).toBe(400);
    expect(errorId(res)).toBe('InvalidQuery');
  });

  it('answers 422 UnknownField when filtering by a field that does not exist', async () => {
    const res = await listArticles({ 'fields.nope': 'x' });
    expect(res.status).toBe(422);
    expect(errorId(res)).toBe('UnknownField');
  });

  it('answers 400 InvalidQuery for a negative skip', async () => {
    const res = await listArticles({ skip: -1 });
    expect(res.status).toBe(400);
  });
});

describe('error bodies', () => {
  it('always carry an Error sys and a human readable message', async () => {
    const answers = [await listArticles({ limit: 5000 }), await listArticles({ 'fields.nope': 'x' }), await deliver('/entries/missing')];
    for (const res of answers) {
      const body = res.data as ApiError;
      expect(body.sys.type).toBe('Error');
      expect(body.message.length).toBeGreaterThan(0);
    }
  });
});
