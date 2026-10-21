import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSearchUrl, NOMINATIM_MIN_INTERVAL_MS, searchAddresses } from './nominatim';

describe('nominatim client', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('restricts to Belgium and returns parsed coordinates', async () => {
    expect(buildSearchUrl('Rue Neuve 1')).toMatch(/countrycodes=be/);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [{ display_name: 'Rue Neuve 1', lat: '50.85', lon: '4.35' }] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchAddresses('Rue Neuve 1')).resolves.toEqual([{ label: 'Rue Neuve 1', latitude: 50.85, longitude: 4.35 }]);
    // cached: no second request
    await searchAddresses('rue neuve 1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends at most one request per second', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal('fetch', fetchMock);
    const first = searchAddresses('Avenue Louise 1');
    const second = searchAddresses('Avenue Louise 2');
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(NOMINATIM_MIN_INTERVAL_MS);
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ignores short queries', async () => {
    await expect(searchAddresses('ab')).resolves.toEqual([]);
  });
});
