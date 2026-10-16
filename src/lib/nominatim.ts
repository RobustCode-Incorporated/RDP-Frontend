// Minimal OpenStreetMap Nominatim client for address autocomplete / geocoding.
// Usage policy (https://operations.osmfoundation.org/policies/nominatim/):
//  - max 1 request per second (enforced below, across the whole app),
//  - no heavy autocomplete: callers debounce (>= 500 ms) and we cache results,
//  - identify the application: browsers send the Referer automatically; an
//    `email` contact is added when VITE_NOMINATIM_EMAIL is configured,
//  - attribution "© OpenStreetMap contributors" is shown under the suggestions.

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
}

const env = import.meta.env as Record<string, string | undefined>;
const NOMINATIM_URL = (env.VITE_NOMINATIM_URL?.trim() || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const NOMINATIM_EMAIL = env.VITE_NOMINATIM_EMAIL?.trim() || '';

export const NOMINATIM_MIN_INTERVAL_MS = 1000;
export const MIN_QUERY_LENGTH = 4;

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, GeocodeResult[]>();

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });

/** Runs `task` respecting the global 1 request / second budget. */
function throttled<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const run = async () => {
    await wait(lastRequestAt + NOMINATIM_MIN_INTERVAL_MS - Date.now(), signal);
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    lastRequestAt = Date.now();
    return task();
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

export function buildSearchUrl(query: string, limit = 5) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    countrycodes: 'be',
    limit: String(limit),
    'accept-language': 'fr',
  });
  if (NOMINATIM_EMAIL) {
    params.set('email', NOMINATIM_EMAIL);
  }
  return `${NOMINATIM_URL}/search?${params.toString()}`;
}

/** Searches Belgian addresses. Returns [] for short queries. Throws AbortError when aborted. */
export async function searchAddresses(query: string, options: { signal?: AbortSignal; limit?: number } = {}) {
  const normalized = query.trim().replace(/\s+/g, ' ');
  if (normalized.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const key = `${normalized.toLowerCase()}|${options.limit ?? 5}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const items = await throttled(async () => {
    const response = await fetch(buildSearchUrl(normalized, options.limit), {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}`);
    }
    return (await response.json()) as NominatimItem[];
  }, options.signal);

  const results = items
    .map((item) => ({ label: item.display_name, latitude: Number(item.lat), longitude: Number(item.lon) }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  cache.set(key, results);
  return results;
}

/** Geocodes a full address to its best match, or null. */
export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const [first] = await searchAddresses(query, { signal, limit: 1 });
  return first ?? null;
}

/** Test helper: resets throttle state and cache. */
export function __resetNominatimForTests() {
  lastRequestAt = 0;
  queue = Promise.resolve();
  cache.clear();
}
