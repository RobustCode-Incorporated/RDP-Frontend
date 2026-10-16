import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { api } from '../api/axios';
import type { ApiError } from '../api/types';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Handler = (request: { url: string; body: unknown }) => unknown;

interface Route {
  method: Method;
  matcher: string | RegExp;
  handler: Handler;
}

export interface MockApi {
  on: (method: Method, matcher: string | RegExp, reply: unknown | Handler) => MockApi;
  /** Calls `method url` recorded so far, in order. */
  calls: Array<{ method: Method; url: string; body: unknown }>;
  callsTo: (method: Method, matcher: string | RegExp) => Array<{ url: string; body: unknown }>;
}

/** Builds an axios error carrying a contract error body (section 1.1). */
export function apiError(status: number, message: string, fieldErrors?: Record<string, string>) {
  const body: ApiError = {
    status,
    error: String(status),
    message,
    timestamp: new Date().toISOString(),
    path: '/api/test',
    ...(fieldErrors ? { fieldErrors } : {}),
  };
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(message, String(status), config, undefined, {
    data: body,
    status,
    statusText: String(status),
    headers: {},
    config,
  });
}

const matches = (matcher: string | RegExp, url: string) =>
  typeof matcher === 'string' ? url === matcher || url.split('?')[0] === matcher : matcher.test(url);

/**
 * Replaces the shared axios instance methods with an in-memory router.
 * Later `on()` registrations win. Unmatched calls reject with a 404 contract error.
 */
export function mockApi(): MockApi {
  const routes: Route[] = [];
  const calls: MockApi['calls'] = [];

  const dispatch = (method: Method) => async (url: string, bodyOrConfig?: unknown) => {
    const body = method === 'GET' || method === 'DELETE' ? undefined : bodyOrConfig;
    calls.push({ method, url, body });
    const route = [...routes].reverse().find((candidate) => candidate.method === method && matches(candidate.matcher, url));
    if (!route) {
      throw apiError(404, `No mock for ${method} ${url}`);
    }
    const data = await route.handler({ url, body });
    return { data, status: 200, statusText: 'OK', headers: {}, config: {} };
  };

  vi.spyOn(api, 'get').mockImplementation(dispatch('GET') as typeof api.get);
  vi.spyOn(api, 'post').mockImplementation(dispatch('POST') as typeof api.post);
  vi.spyOn(api, 'put').mockImplementation(dispatch('PUT') as typeof api.put);
  vi.spyOn(api, 'patch').mockImplementation(dispatch('PATCH') as typeof api.patch);
  vi.spyOn(api, 'delete').mockImplementation(dispatch('DELETE') as typeof api.delete);

  const mock: MockApi = {
    calls,
    on(method, matcher, reply) {
      const handler: Handler = typeof reply === 'function' ? (reply as Handler) : () => reply;
      routes.push({ method, matcher, handler });
      return mock;
    },
    callsTo(method, matcher) {
      return calls.filter((call) => call.method === method && matches(matcher, call.url));
    },
  };
  return mock;
}
