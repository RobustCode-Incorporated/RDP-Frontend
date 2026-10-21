import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { api } from './axios';
import { useAuthStore } from '../store/useAuthStore';
import { makeTestJwt } from '../test/jwt';

const respondWith = (status: number): AxiosAdapter => async (config: InternalAxiosRequestConfig) => {
  const response = { data: {}, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    throw new AxiosError('Request failed', String(status), config, undefined, response);
  }
  return response;
};

describe('api 401 interceptor', () => {
  const assign = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    assign.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/driver', assign },
    });
    useAuthStore.getState().setAuth({ id: 1, email: 'driver@test.com', role: 'DRIVER' }, makeTestJwt(3600));
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    useAuthStore.getState().logout();
  });

  it('logs out and redirects to /login when the API returns 401', async () => {
    await expect(api.get('/api/deliveries/me', { adapter: respondWith(401) })).rejects.toBeInstanceOf(AxiosError);

    expect(useAuthStore.getState().token).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('does not log out on other errors', async () => {
    await expect(api.get('/api/deliveries/me', { adapter: respondWith(500) })).rejects.toBeInstanceOf(AxiosError);

    expect(useAuthStore.getState().token).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not redirect when the login call itself returns 401', async () => {
    useAuthStore.getState().logout();

    await expect(api.post('/api/auth/login', {}, { adapter: respondWith(401) })).rejects.toBeInstanceOf(AxiosError);

    expect(assign).not.toHaveBeenCalled();
  });
});
