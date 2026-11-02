import axios from 'axios';
import { config } from './delivery';

export const GRAPHQL_URL = `https://graphql.contentful.com/content/v1/spaces/${config.spaceId}/environments/${config.environment}`;

export interface GraphQLError {
  message: string;
  extensions?: { contentful?: { code?: string } };
}

export interface GraphQLBody<T> {
  data?: T | null;
  errors?: GraphQLError[];
}

export interface GraphQLAnswer<T> {
  status: number;
  headers: Record<string, unknown>;
  body: GraphQLBody<T>;
  ms: number;
}

export interface ArticleItem {
  sys: { id: string; publishedVersion: number };
  title: string;
  slug: string;
  body: string;
  author: string;
  publishedDate: string;
}

export interface Collection<T> {
  total: number;
  skip: number;
  limit: number;
  items: T[];
}

interface Options {
  token?: string | null;
  url?: string;
}

// It never throws on an HTTP error status, so tests can assert on 4xx answers.
export async function graphql<T = unknown>(query: string, variables?: Record<string, unknown>, options: Options = {}): Promise<GraphQLAnswer<T>> {
  const token = options.token === undefined ? config.cdaToken : options.token;
  const started = performance.now();
  const res = await axios.post(
    options.url ?? GRAPHQL_URL,
    { query, variables },
    { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, validateStatus: () => true, timeout: 15_000 },
  );
  return { status: res.status, headers: res.headers as Record<string, unknown>, body: res.data as GraphQLBody<T>, ms: performance.now() - started };
}

export const errorCode = (answer: GraphQLAnswer<unknown>): string | undefined => answer.body.errors?.[0]?.extensions?.contentful?.code;

export async function articles(args = '', fields = 'slug'): Promise<Collection<Record<string, unknown>>> {
  const answer = await graphql<{ articleCollection: Collection<Record<string, unknown>> }>(`{ articleCollection${args ? `(${args})` : ''} { total skip limit items { ${fields} } } }`);
  if (answer.status !== 200 || !answer.body.data) throw new Error(`Unexpected GraphQL answer (${answer.status}): ${JSON.stringify(answer.body.errors)}`);
  return answer.body.data.articleCollection;
}
