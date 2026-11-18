// Route ordering helpers for the technician's daily timetable. Pure functions, no I/O.
// Spec: docs/superpowers/specs/2026-11-09-technician-route-order-design.md

export interface LatLon { lat: number; lon: number }

/** Straight-line distance is multiplied by this to approximate road distance. */
export const ROAD_FACTOR = 1.3;
/** Average urban speed used for travel-time estimates. */
export const SPEED_KMH = 25;
/** Service time when a task has no usable end time. */
export const DEFAULT_SERVICE_MIN = 60;
/** Warn "early" when arriving more than this many minutes before the appointment. */
export const EARLY_TOLERANCE_MIN = 30;
/** Warn "late" when arriving more than this many minutes after the appointment. */
export const LATE_TOLERANCE_MIN = 15;

export function haversineKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function roadKm(a: LatLon, b: LatLon): number {
  return haversineKm(a, b) * ROAD_FACTOR;
}

export function travelMinutes(km: number): number {
  return (km / SPEED_KMH) * 60;
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

export function formatMinutes(min: number): string {
  const total = Math.max(1, Math.round(min));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

/**
 * Suggested visiting order. Nearest-neighbour from `start`, then 2-opt until no segment
 * reversal shortens the route. With no `start`, the first input stop stays first.
 * Ties keep input order, so the result is deterministic.
 */
export function orderStops(start: LatLon | null, points: Array<{ id: string; point: LatLon }>): string[] {
  if (points.length <= 1) return points.map(p => p.id);

  const remaining = [...points];
  const route: Array<{ id: string; point: LatLon }> = [];
  let from = start;
  if (!from) {
    const first = remaining.shift()!;
    route.push(first);
    from = first.point;
  }
  while (remaining.length > 0) {
    let best = 0;
    let bestKm = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const km = roadKm(from, remaining[i].point);
      if (km < bestKm) { bestKm = km; best = i; }
    }
    const [next] = remaining.splice(best, 1);
    route.push(next);
    from = next.point;
  }

  const length = (list: typeof route) => {
    let total = 0;
    let prev = start;
    for (const stop of list) {
      if (prev) total += roadKm(prev, stop.point);
      prev = stop.point;
    }
    return total;
  };

  // The first stop is fixed when there is no start point.
  const lowest = start ? 0 : 1;
  let best = length(route);
  for (let round = 0; round < 50; round++) {
    let improved = false;
    for (let i = lowest; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const candidate = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        const km = length(candidate);
        if (km < best - 1e-9) { route.splice(0, route.length, ...candidate); best = km; improved = true; }
      }
    }
    if (!improved) break;
  }
  return route.map(stop => stop.id);
}

export interface RouteStop {
  id: string;
  point: LatLon | null;
  scheduledAt: string;
  estimatedEndTime: string | null;
}

export interface StopWarning { kind: 'early' | 'late'; minutes: number }

export interface PlannedStop {
  id: string;
  /** 1-based position in the suggested route; null when the stop is not part of it. */
  order: number | null;
  kmFromPrevious: number | null;
  minutesFromPrevious: number | null;
  /** True only when the first leg is measured from the technician's current position. */
  legFromCurrent: boolean;
  /** Estimated arrival, ISO string; null when it cannot be estimated. */
  arrivalAt: string | null;
  warning: StopWarning | null;
}

export interface ShiftPlan {
  stops: PlannedStop[];
  totalKm: number;
  endPoint: LatLon | null;
  /** When the technician leaves the last stop, in ms since epoch. */
  departAt: number | null;
}

const MS_PER_MIN = 60000;

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

const unplanned = (stop: RouteStop): PlannedStop => ({
  id: stop.id, order: null, kmFromPrevious: null, minutesFromPrevious: null, legFromCurrent: false, arrivalAt: null, warning: null,
});

/**
 * Plans one shift. `stops` come in appointment order. Stops with a position are reordered among the
 * slots they already occupy; stops without one keep their place. Arrival times assume the technician
 * leaves so as to reach the first suggested stop at the shift's earliest appointment (not before
 * `floorMs`), waits for an appointment that has not started, and works for the task's duration.
 */
export function planShift(stops: RouteStop[], start: LatLon | null, floorMs: number | null, startIsCurrent = false): ShiftPlan {
  const placed = stops.filter((s): s is RouteStop & { point: LatLon } => s.point !== null);
  if (placed.length < 2) {
    return {
      stops: stops.map(unplanned),
      totalKm: 0,
      endPoint: placed[0]?.point ?? null,
      departAt: null,
    };
  }

  const ids = orderStops(start, placed.map(s => ({ id: s.id, point: s.point })));
  const byId = new Map(placed.map(s => [s.id, s]));
  const route = ids.map(id => byId.get(id)!);

  const scheduled = route.map(s => parseMs(s.scheduledAt));
  const valid = scheduled.filter((ms): ms is number => ms !== null);
  const earliest = valid.length > 0 ? Math.min(...valid) : null;

  const planned = new Map<string, PlannedStop>();
  let totalKm = 0;
  let prev: LatLon | null = start;
  let clock: number | null = null;
  let departAt: number | null = null;

  route.forEach((stop, index) => {
    const km = prev ? roadKm(prev, stop.point) : null;
    const minutes = km === null ? null : travelMinutes(km);
    if (km !== null) totalKm += km;

    let arrival: number | null = null;
    if (earliest !== null) {
      if (index === 0) {
        const lead = (minutes ?? 0) * MS_PER_MIN;
        const depart = Math.max(floorMs ?? -Infinity, earliest - lead);
        arrival = depart + lead;
      } else if (clock !== null) {
        arrival = clock + (minutes ?? 0) * MS_PER_MIN;
      }
    }

    let warning: StopWarning | null = null;
    const sched = scheduled[index];
    if (arrival !== null && sched !== null) {
      const diff = (arrival - sched) / MS_PER_MIN;
      if (diff > LATE_TOLERANCE_MIN) warning = { kind: 'late', minutes: Math.round(diff) };
      else if (-diff > EARLY_TOLERANCE_MIN) warning = { kind: 'early', minutes: Math.round(-diff) };
    }

    if (arrival !== null) {
      const end = parseMs(stop.estimatedEndTime);
      const service = sched !== null && end !== null && end > sched ? (end - sched) / MS_PER_MIN : DEFAULT_SERVICE_MIN;
      clock = Math.max(arrival, sched ?? arrival) + service * MS_PER_MIN;
      departAt = clock;
    } else {
      clock = null;
      departAt = null;
    }

    planned.set(stop.id, {
      id: stop.id,
      order: index + 1,
      kmFromPrevious: km,
      minutesFromPrevious: minutes,
      legFromCurrent: index === 0 && startIsCurrent && start !== null,
      arrivalAt: arrival === null ? null : new Date(arrival).toISOString(),
      warning,
    });
    prev = stop.point;
  });

  // Put the route back into the slots the positioned stops occupied.
  let next = 0;
  const result = stops.map(stop => (stop.point === null ? unplanned(stop) : planned.get(ids[next++])!));
  return { stops: result, totalKm, endPoint: route[route.length - 1].point, departAt };
}

/**
 * Plans the morning, afternoon and evening shifts in turn. Each shift starts where the previous one
 * ended and not before it finished; the first starts at `start` and not before `nowMs`.
 */
export function planDay(shifts: RouteStop[][], start: LatLon | null, nowMs: number | null): ShiftPlan[] {
  let origin = start;
  let originIsCurrent = start !== null;
  let floor = nowMs;
  return shifts.map(stops => {
    const plan = planShift(stops, origin, floor, originIsCurrent);
    if (plan.endPoint) { origin = plan.endPoint; originIsCurrent = false; }
    if (plan.departAt !== null) floor = plan.departAt;
    return plan;
  });
}

/** Google Maps allows a limited number of stops in a link: 9 waypoints plus the destination. */
const MAX_MAP_ADDRESSES = 10;

/** Directions link through the given addresses in order, from the user's current location. */
export function mapsRouteUrl(addresses: string[]): string | null {
  const list = addresses.slice(0, MAX_MAP_ADDRESSES);
  if (list.length === 0) return null;
  const params = new URLSearchParams({ api: '1', destination: list[list.length - 1] });
  if (list.length > 1) params.set('waypoints', list.slice(0, -1).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}
