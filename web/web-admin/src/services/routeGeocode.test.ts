import { describe, expect, it } from 'vitest';
import { createGeocoder, normalizeAddress, type GeoStore } from './routeGeocode';

function memoryStore(initial: Record<string, string> = {}): GeoStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: key => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = value; } };
}

function fakeFetch(answers: Array<Array<{ lat: string; lon: string }> | Error>) {
  const urls: string[] = [];
  let index = 0;
  const fn = (async (url: string) => {
    urls.push(String(url));
    const answer = answers[Math.min(index++, answers.length - 1)];
    if (answer instanceof Error) throw answer;
    return { ok: true, json: async () => answer } as Response;
  }) as unknown as typeof fetch;
  return { fn, urls };
}

const hit = [{ lat: '21.0', lon: '105.8' }];

describe('normalizeAddress', () => {
  it('lowercases, collapses spaces and trims spaces around commas', () => {
    expect(normalizeAddress('  12  Chùa Bộc ,  Hà Nội ')).toBe('12 chùa bộc, hà nội');
  });
});

describe('createGeocoder', () => {
  it('calls the network once per new address and waits at least 1100 ms between calls', async () => {
    const { fn, urls } = fakeFetch([hit, hit]);
    const sleeps: number[] = [];
    const geocoder = createGeocoder({ fetchFn: fn, storage: memoryStore(), sleep: async ms => { sleeps.push(ms); } });
    const result = await geocoder.geocodeAll(['Addr one', 'Addr two'], () => {});
    expect(urls).toHaveLength(2);
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThan(1000);
    expect(sleeps[0]).toBeLessThanOrEqual(1100);
    expect(result.get('Addr one')).toEqual({ lat: 21, lon: 105.8 });
    const params = new URL(urls[0]).searchParams;
    expect(params.get('countrycodes')).toBe('vn');
    expect(params.get('limit')).toBe('1');
    expect(params.get('q')).toBe('Addr one');
  });

  it('serves cached addresses without the network or a wait', async () => {
    const store = memoryStore({ 'route-geo:v1': JSON.stringify({ 'a b': [21.5, 105.5] }) });
    const { fn, urls } = fakeFetch([hit]);
    const sleeps: number[] = [];
    const geocoder = createGeocoder({ fetchFn: fn, storage: store, sleep: async ms => { sleeps.push(ms); } });
    const result = await geocoder.geocodeAll(['A  B'], () => {});
    expect(urls).toHaveLength(0);
    expect(sleeps).toHaveLength(0);
    expect(result.get('A  B')).toEqual({ lat: 21.5, lon: 105.5 });
  });

  it('treats the same address written with different spacing and case as one request', async () => {
    const { fn, urls } = fakeFetch([hit]);
    const geocoder = createGeocoder({ fetchFn: fn, storage: memoryStore(), sleep: async () => {} });
    const result = await geocoder.geocodeAll(['Số 1 Hà Nội', 'số  1  hà nội'], () => {});
    expect(urls).toHaveLength(1);
    expect(result.get('Số 1 Hà Nội')).toEqual(result.get('số  1  hà nội'));
  });

  it('returns null and does not cache when there is no result or the network fails', async () => {
    const store = memoryStore();
    const { fn } = fakeFetch([[], new Error('offline')]);
    const geocoder = createGeocoder({ fetchFn: fn, storage: store, sleep: async () => {} });
    const result = await geocoder.geocodeAll(['nowhere', 'broken'], () => {});
    expect(result.get('nowhere')).toBeNull();
    expect(result.get('broken')).toBeNull();
    expect(store.data['route-geo:v1']).toBeUndefined();
  });

  it('retries with a shorter address when the full one has no result', async () => {
    const { fn, urls } = fakeFetch([[], hit]);
    const sleeps: number[] = [];
    const geocoder = createGeocoder({ fetchFn: fn, storage: memoryStore(), sleep: async ms => { sleeps.push(ms); } });
    const result = await geocoder.geocodeAll(['Tên nơi, 12 Chùa Bộc, Đống Đa, Hà Nội'], () => {});
    expect(urls).toHaveLength(2);
    expect(new URL(urls[1]).searchParams.get('q')).toBe('12 Chùa Bộc, Đống Đa, Hà Nội');
    expect(sleeps).toHaveLength(1);
    expect(result.get('Tên nơi, 12 Chùa Bộc, Đống Đa, Hà Nội')).toEqual({ lat: 21, lon: 105.8 });
  });

  it('gives up after three tries and never retries a network error', async () => {
    const empty = fakeFetch([[], [], []]);
    const g1 = createGeocoder({ fetchFn: empty.fn, storage: memoryStore(), sleep: async () => {} });
    const none = await g1.geocodeAll(['a1, b2, c3, d4, e5'], () => {});
    expect(empty.urls).toHaveLength(3);
    expect(none.get('a1, b2, c3, d4, e5')).toBeNull();

    const broken = fakeFetch([new Error('offline')]);
    const g2 = createGeocoder({ fetchFn: broken.fn, storage: memoryStore(), sleep: async () => {} });
    await g2.geocodeAll(['a1, b2, c3, d4'], () => {});
    expect(broken.urls).toHaveLength(1);
  });

  it('keeps at most 300 cached addresses, dropping the oldest', async () => {
    const seeded: Record<string, [number, number]> = {};
    for (let i = 0; i < 300; i++) seeded[`seed ${i}`] = [1, 1];
    const store = memoryStore({ 'route-geo:v1': JSON.stringify(seeded) });
    const { fn } = fakeFetch([hit]);
    const geocoder = createGeocoder({ fetchFn: fn, storage: store, sleep: async () => {} });
    await geocoder.geocodeAll(['brand new'], () => {});
    const saved = JSON.parse(store.data['route-geo:v1']) as Record<string, unknown>;
    expect(Object.keys(saved)).toHaveLength(300);
    expect(saved['seed 0']).toBeUndefined();
    expect(saved['brand new']).toBeDefined();
  });

  it('stops with an AbortError when the signal is aborted', async () => {
    const { fn, urls } = fakeFetch([hit, hit]);
    const controller = new AbortController();
    const geocoder = createGeocoder({ fetchFn: fn, storage: memoryStore(), sleep: async () => { controller.abort(); } });
    await expect(geocoder.geocodeAll(['one', 'two'], () => {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(urls).toHaveLength(1);
  });

  it('works without any storage', async () => {
    const { fn } = fakeFetch([hit]);
    const geocoder = createGeocoder({ fetchFn: fn, storage: null, sleep: async () => {} });
    const result = await geocoder.geocodeAll(['x y z'], () => {});
    expect(result.get('x y z')).toEqual({ lat: 21, lon: 105.8 });
  });

  it('reports progress up to the number of distinct addresses', async () => {
    const { fn } = fakeFetch([hit]);
    const calls: Array<[number, number]> = [];
    const geocoder = createGeocoder({ fetchFn: fn, storage: memoryStore(), sleep: async () => {} });
    await geocoder.geocodeAll(['p', 'q', 'P'], (done, total) => calls.push([done, total]));
    expect(calls[calls.length - 1]).toEqual([2, 2]);
    expect(calls.every(([done, total]) => done <= total && total === 2)).toBe(true);
  });
});
