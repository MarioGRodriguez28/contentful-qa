import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { Config } from './config';

export const CMA_BASE = 'https://api.contentful.com';

export interface Sys {
  id: string;
  version: number;
  publishedVersion?: number;
}

export function createCma(config: Config): AxiosInstance {
  return axios.create({
    baseURL: `${CMA_BASE}/spaces/${config.spaceId}`,
    headers: {
      Authorization: `Bearer ${config.cmaToken}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
    },
    timeout: 15_000,
    validateStatus: () => true,
  });
}

export function describeFailure(res: AxiosResponse): string {
  const data = res.data as { sys?: { id?: string }; message?: string } | undefined;
  return `${res.status} ${data?.sys?.id ?? ''} ${data?.message ?? ''}`.trim();
}

// One retry per rate-limit response, waiting as long as the API asks.
export async function call(
  cma: AxiosInstance,
  method: 'get' | 'put' | 'delete',
  url: string,
  data?: unknown,
  headers: Record<string, string | number> = {},
): Promise<AxiosResponse> {
  for (let attempt = 0; ; attempt += 1) {
    const res = await cma.request({ method, url, data, headers });
    if (res.status !== 429 || attempt >= 3) return res;
    const wait = Number(res.headers['x-contentful-ratelimit-reset']) || 1;
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  }
}

export function expectOk(res: AxiosResponse, what: string): AxiosResponse {
  if (res.status >= 400) throw new Error(`${what} failed: ${describeFailure(res)}`);
  return res;
}
