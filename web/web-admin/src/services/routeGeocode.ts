// Address -> coordinates in the browser through OpenStreetMap Nominatim, with a local cache.
// Nominatim allows at most one request per second, so network calls are sequential and spaced.
// Spec: docs/superpowers/specs/2026-11-09-technician-route-order-design.md

import type { LatLon } from './routePlanner';

export interface GeoStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const CACHE_KEY = 'route-geo:v1';
const MAX_CACHED = 300;
const DEFAULT_GAP_MS = 1100;
const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function defaultStorage(): GeoStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * The address as written, then the same address without its first one or two comma-separated parts
 * (usually a place name or an old street number the map does not know), keeping at least two parts.
 */
function fallbackQueries(address: string): string[] {
  const parts = address.split(',').map(part => part.trim()).filter(Boolean);
  const queries = [address];
  for (const drop of [1, 2]) {
    if (parts.length - drop >= 2) queries.push(parts.slice(drop).join(', '));
  }
  return queries;
}

export interface GeocoderOptions {
  fetchFn?: typeof fetch;
  storage?: GeoStore | null;
  minGapMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export function createGeocoder(options: GeocoderOptions = {}) {
  const fetchFn = options.fetchFn ?? fetch.bind(globalThis);
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const gap = options.minGapMs ?? DEFAULT_GAP_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  let lastNetworkAt: number | null = null;

  function load(): Record<string, [number, number]> {
    try {
      const raw = storage?.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, [number, number]>) : {};
    } catch {
      return {};
    }
  }

  function save(cache: Record<string, [number, number]>) {
    const keys = Object.keys(cache);
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_CACHED))) delete cache[key];
    try {
      storage?.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      /* storage full or blocked: the cache is only an optimisation */
    }
  }

  /** A position, null when the service has no match, or 'error' when the request itself failed. */
  async function lookup(address: string, signal?: AbortSignal): Promise<LatLon | null | 'error'> {
    const params = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'vn', 'accept-language': 'vi', q: address });
    try {
      const response = await fetchFn(`${ENDPOINT}?${params}`, { signal, headers: { Accept: 'application/json' } });
      if (!response.ok) return 'error';
      const rows = (await response.json()) as Array<{ lat: string; lon: string }>;
      const lat = Number(rows?.[0]?.lat);
      const lon = Number(rows?.[0]?.lon);
      return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    } catch {
      if (signal?.aborted) throw abortError();
      return 'error';
    }
  }

  async function geocodeAll(
    addresses: string[],
    onProgress: (done: number, total: number) => void,
    signal?: AbortSignal,
  ): Promise<Map<string, LatLon | null>> {
    if (signal?.aborted) throw abortError();
    const cache = load();
    const unique = new Map<string, string>();
    for (const address of addresses) {
      const key = normalizeAddress(address);
      if (key && !unique.has(key)) unique.set(key, address);
    }
    const total = unique.size;
    const found = new Map<string, LatLon | null>();
    let done = 0;
    onProgress(done, total);

    for (const [key, address] of unique) {
      const cached = cache[key];
      if (cached) {
        found.set(key, { lat: cached[0], lon: cached[1] });
      } else {
        let point: LatLon | null = null;
        for (const query of fallbackQueries(address)) {
          if (lastNetworkAt !== null) {
            const wait = gap - (Date.now() - lastNetworkAt);
            if (wait > 0) await sleep(wait);
            if (signal?.aborted) throw abortError();
          }
          lastNetworkAt = Date.now();
          const answer = await lookup(query, signal);
          if (answer === 'error') break;
          point = answer;
          if (point) break;
        }
        found.set(key, point);
        if (point) {
          cache[key] = [point.lat, point.lon];
          save(cache);
        }
      }
      done += 1;
      onProgress(done, total);
    }

    const result = new Map<string, LatLon | null>();
    for (const address of addresses) result.set(address, found.get(normalizeAddress(address)) ?? null);
    return result;
  }

  return { geocodeAll };
}
