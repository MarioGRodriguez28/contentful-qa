import axios from 'axios';
import { loadDeliveryConfig } from '../../src/config';

export const config = loadDeliveryConfig();
export const DELIVERY_ROOT = 'https://cdn.contentful.com';
export const ENV_PATH = `/spaces/${config.spaceId}/environments/${config.environment}`;

export interface Entry {
  sys: {
    type: string;
    id: string;
    contentType: { sys: { id: string } };
    publishedVersion: number;
    createdAt: string;
    updatedAt: string;
  };
  fields: Record<string, unknown>;
}

export interface EntryList {
  sys: { type: string };
  total: number;
  skip: number;
  limit: number;
  items: Entry[];
}

export interface ApiError {
  sys: { type: string; id: string };
  message: string;
}

export interface Answer<T = unknown> {
  status: number;
  headers: Record<string, unknown>;
  data: T;
  ms: number;
}

interface Options {
  token?: string | null;
  basePath?: string;
}

// Read-only helper. It never throws on an HTTP error status, so tests can assert on 4xx answers.
export async function deliver<T = unknown>(path: string, params: Record<string, string | number> = {}, options: Options = {}): Promise<Answer<T>> {
  const token = options.token === undefined ? config.cdaToken : options.token;
  const started = performance.now();
  const res = await axios.get(DELIVERY_ROOT + (options.basePath ?? ENV_PATH) + path, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
    timeout: 15_000,
  });
  return { status: res.status, headers: res.headers as Record<string, unknown>, data: res.data as T, ms: performance.now() - started };
}

export const listArticles = (params: Record<string, string | number> = {}) => deliver<EntryList>('/entries', { content_type: 'article', ...params });
