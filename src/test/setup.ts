import '@testing-library/jest-dom';

// Recent Node versions ship an experimental global `localStorage` that is
// undefined unless `--localstorage-file` is passed, and it shadows jsdom's.
// Provide an in-memory Storage so code paths that persist the session run in tests.
if (typeof window !== 'undefined' && !window.localStorage) {
  const data = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage });
}

import { createElement } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { __resetNominatimForTests } from '../lib/nominatim';

// Leaflet does not render in jsdom: replace the lazy map with a lightweight stub.
vi.mock('../components/shared/LiveMap', () => ({
  LiveMap: ({ points }: { points: Array<{ kind: string; label: string }> }) =>
    createElement(
      'div',
      { 'data-testid': 'live-map' },
      points.map((point) => `${point.kind}:${point.label}`).join(' | ')
    ),
}));

beforeEach(() => {
  // No real network in tests: Nominatim calls must be mocked explicitly per test.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch is not mocked in this test'))));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  __resetNominatimForTests();
});
