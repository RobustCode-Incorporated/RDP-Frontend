import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTestJwt } from '../test/jwt';

const AUTH_STORAGE_KEY = 'rdp-auth';
const user = { id: 1, email: 'driver@test.com', role: 'DRIVER' };

const loadStore = async () => {
  vi.resetModules();
  const { useAuthStore } = await import('./useAuthStore');
  return useAuthStore;
};

describe('useAuthStore session restore on app load', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('restores a persisted session whose token is still valid', async () => {
    const token = makeTestJwt(3600);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));

    const store = await loadStore();

    expect(store.getState().token).toBe(token);
    expect(store.getState().user).toEqual(user);
  });

  it('logs out when the persisted token is expired', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token: makeTestJwt(-60) }));

    const store = await loadStore();

    expect(store.getState().token).toBeNull();
    expect(store.getState().user).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('logs out when the persisted token is malformed', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token: 'garbage' }));

    const store = await loadStore();

    expect(store.getState().token).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
