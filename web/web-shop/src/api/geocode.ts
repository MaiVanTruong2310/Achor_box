// Address search and reverse geocoding through OpenStreetMap Nominatim (no API key).
// Usage policy: at most 1 request per second, so callers debounce and results are cached.
// For production traffic, route this through a backend proxy or a paid provider (Goong, Google Places).

export interface LatLon { lat: number; lon: number }
export interface Place extends LatLon { id: string; label: string; distanceKm?: number }

const BASE = 'https://nominatim.openstreetmap.org';
const cache = new Map<string, Place[]>();
/** Half-size of the area searched first around the reference point, in degrees (about 22 km). */
const NEAR_RADIUS_DEG = 0.2;
const MAX_RESULTS = 5;

/** "12, Chùa Bộc, Phường X, Quận Y, Hà Nội, 10000, Việt Nam" -> without the postcode and country. */
export function cleanLabel(name: string): string {
  return name
    .split(',')
    .map(part => part.trim())
    .filter(part => part && !/^\d{5,6}$/.test(part) && !/^việt nam$/i.test(part))
    .join(', ');
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}


/** Lower case, no diacritics, so "Học viện" matches "hoc vien". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Nominatim also returns loose matches (a school on "Hương Viên" street for "Học viện").
 * Keep results that contain the whole phrase; only if there are fewer than 3 of those, accept
 * results that contain every word. Matches in the place name come before matches in the address.
 */
function relevant(places: Place[], query: string): Array<Place & { inName: boolean }> {
  const phrase = normalize(query);
  const tokens = phrase.split(' ').filter(Boolean);
  const scored = places.map(p => {
    const label = normalize(p.label);
    const name = normalize(p.label.split(', ')[0]);
    return { ...p, inName: name.includes(phrase), phrase: label.includes(phrase), all: tokens.every(t => label.includes(t)) };
  });
  let kept = scored.filter(p => p.phrase);
  if (kept.length < 3) kept = scored.filter(p => p.phrase || p.all);
  return kept.map(({ phrase: _phrase, all: _all, ...rest }) => rest);
}

interface RawPlace { place_id: number; display_name: string; lat: string; lon: string }

async function request(q: string, near: LatLon | undefined, bounded: boolean, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '25', countrycodes: 'vn', 'accept-language': 'vi', q });
  if (near) {
    const dLon = NEAR_RADIUS_DEG / Math.max(0.2, Math.cos((near.lat * Math.PI) / 180));
    // viewbox = left,top,right,bottom. "bounded" restricts to the box; without it the box only raises the rank.
    params.set('viewbox', [near.lon - dLon, near.lat + NEAR_RADIUS_DEG, near.lon + dLon, near.lat - NEAR_RADIUS_DEG].join(','));
    if (bounded) params.set('bounded', '1');
  }
  const response = await fetch(`${BASE}/search?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Dịch vụ gợi ý địa chỉ đang bận. Hãy thử lại sau.');
  const rows = (await response.json()) as RawPlace[];
  return rows.map(row => ({ id: String(row.place_id), label: cleanLabel(row.display_name), lat: Number(row.lat), lon: Number(row.lon) }));
}

/**
 * Suggestions ordered by distance from `near` (the user's position, or the map centre).
 * Looks inside a ~22 km box around `near` first; only if that gives fewer than 3 results does it
 * widen to the whole country, and those farther results always rank after the nearby ones.
 */
export async function searchPlaces(query: string, near?: LatLon, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const key = `${q.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lon.toFixed(2)}` : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let places = await request(q, near, true, signal);
  if (!near || places.length < 3) {
    const wider = await request(q, near, false, signal);
    const seen = new Set(places.map(p => p.id));
    places = [...places, ...wider.filter(p => !seen.has(p.id))];
  }
  const unique = new Set<string>();
  const matched = relevant(places, q).filter(p => { const k = normalize(p.label); if (unique.has(k)) return false; unique.add(k); return true; }).map(p => (near ? { ...p, distanceKm: distanceKm(near, p) } : p));
  matched.sort((a, b) => Number(b.inName) - Number(a.inName) || (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  places = matched.slice(0, MAX_RESULTS).map(({ inName: _inName, ...rest }) => rest);
  if (cache.size > 100) cache.clear();
  cache.set(key, places);
  return places;
}

export async function reversePlace(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({ format: 'jsonv2', zoom: '18', 'accept-language': 'vi', lat: String(lat), lon: String(lon) });
  const response = await fetch(`${BASE}/reverse?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const row = (await response.json()) as { display_name?: string };
  return row.display_name ? cleanLabel(row.display_name) : null;
}
