import { describe, expect, it } from 'vitest';
import { formatKm, formatMinutes, haversineKm, mapsRouteUrl, orderStops, planDay, planShift, roadKm, ROAD_FACTOR, travelMinutes, type LatLon, type RouteStop } from './routePlanner';

describe('distance helpers', () => {
  it('haversineKm: one degree of longitude on the equator is about 111 km', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.19, 0);
  });

  it('roadKm: straight line multiplied by the road factor', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 1 };
    expect(ROAD_FACTOR).toBe(1.3);
    expect(roadKm(a, b)).toBeCloseTo(haversineKm(a, b) * 1.3, 6);
  });

  it('travelMinutes: 12.5 km at 25 km/h is 30 minutes', () => {
    expect(travelMinutes(12.5)).toBe(30);
  });
});

describe('formatting', () => {
  it('formatKm: metres under 1 km, one decimal under 10 km, whole km above', () => {
    expect(formatKm(0.45)).toBe('450 m');
    expect(formatKm(3.24)).toBe('3,2 km');
    expect(formatKm(12.4)).toBe('12 km');
  });

  it('formatMinutes: minutes, then hours and minutes', () => {
    expect(formatMinutes(8.4)).toBe('8 phút');
    expect(formatMinutes(75)).toBe('1 giờ 15 phút');
    expect(formatMinutes(120)).toBe('2 giờ');
  });
});

describe('orderStops', () => {
  const at = (id: string, lat: number, lon: number) => ({ id, point: { lat, lon } });
  const pathKm = (start: LatLon | null, ids: string[], pts: Array<{ id: string; point: LatLon }>) => {
    const byId = new Map(pts.map(p => [p.id, p.point]));
    let total = 0;
    let prev = start;
    for (const id of ids) {
      const cur = byId.get(id)!;
      if (prev) total += roadKm(prev, cur);
      prev = cur;
    }
    return total;
  };

  it('visits the nearest stop first, then the next nearest', () => {
    const order = orderStops({ lat: 0, lon: 0 }, [at('a', 0, 0.1), at('b', 0, 0.3), at('c', 0, 0.2)]);
    expect(order).toEqual(['a', 'c', 'b']);
  });

  it('without a start point the first input stop stays first', () => {
    const order = orderStops(null, [at('b', 0, 0.3), at('a', 0, 0.1), at('c', 0, 0.2)]);
    expect(order[0]).toBe('b');
    expect([...order].sort()).toEqual(['a', 'b', 'c']);
  });

  it('never makes the route longer than the input order', () => {
    const pts = [at('p1', 21.0, 105.8), at('p2', 21.1, 105.9), at('p3', 21.01, 105.81), at('p4', 21.09, 105.91), at('p5', 21.02, 105.82), at('p6', 21.08, 105.92)];
    const start = { lat: 21.0, lon: 105.8 };
    const inputOrder = pts.map(p => p.id);
    const order = orderStops(start, pts);
    expect([...order].sort()).toEqual([...inputOrder].sort());
    expect(pathKm(start, order, pts)).toBeLessThanOrEqual(pathKm(start, inputOrder, pts) + 1e-9);
  });

  it('keeps input order for stops at the same place', () => {
    const order = orderStops({ lat: 0, lon: 0 }, [at('x', 0, 0.1), at('y', 0, 0.1), at('z', 0, 0.5)]);
    expect(order.indexOf('x')).toBeLessThan(order.indexOf('y'));
  });

  it('handles empty and single-stop input', () => {
    expect(orderStops({ lat: 0, lon: 0 }, [])).toEqual([]);
    expect(orderStops(null, [at('only', 1, 1)])).toEqual(['only']);
  });
});

describe('planShift and planDay', () => {
  const at = (hhmm: string) => `2026-11-10T${hhmm}:00+07:00`;
  // 0.0864731 degrees of longitude on the equator is 9.615 km straight, 12.5 km by road, 30 minutes at 25 km/h.
  const HALF_HOUR = 0.0864731;
  const stop = (id: string, lon: number | null, scheduled: string, end: string | null): RouteStop => ({
    id, point: lon === null ? null : { lat: 0, lon }, scheduledAt: scheduled, estimatedEndTime: end,
  });
  const minutesBetween = (iso: string | null, expected: string) => Math.abs(Date.parse(iso!) - Date.parse(expected)) / 60000;

  it('warns "early" when the suggested order reaches a stop long before its appointment', () => {
    const plan = planShift([stop('s1', 0, at('09:00'), at('10:00')), stop('s2', HALF_HOUR, at('11:30'), at('12:30'))], null, null);
    expect(minutesBetween(plan.stops[1].arrivalAt, at('10:30'))).toBeLessThan(1);
    expect(plan.stops[1].warning).toEqual({ kind: 'early', minutes: 60 });
    expect(plan.stops[0].warning).toBeNull();
  });

  it('warns "late" when the previous stop overruns into the next appointment', () => {
    const plan = planShift([stop('s1', 0, at('09:00'), at('11:00')), stop('s2', HALF_HOUR, at('10:00'), at('11:00'))], null, null);
    expect(plan.stops[1].warning).toEqual({ kind: 'late', minutes: 90 });
  });

  it('numbers stops in route order and totals the distance', () => {
    const plan = planShift([stop('s1', 0, at('09:00'), at('10:00')), stop('s2', HALF_HOUR, at('10:30'), at('11:30'))], null, null);
    expect(plan.stops.map(s => s.order)).toEqual([1, 2]);
    expect(plan.stops[0].kmFromPrevious).toBeNull();
    expect(plan.stops[1].kmFromPrevious).toBeCloseTo(12.5, 1);
    expect(plan.stops[1].minutesFromPrevious).toBeCloseTo(30, 0);
    expect(plan.totalKm).toBeCloseTo(12.5, 1);
  });

  it('measures the first leg from the start point when there is one', () => {
    const plan = planShift([stop('s1', HALF_HOUR, at('09:00'), at('10:00')), stop('s2', HALF_HOUR * 2, at('10:30'), at('11:30'))], { lat: 0, lon: 0 }, null);
    expect(plan.stops[0].kmFromPrevious).toBeCloseTo(12.5, 1);
    expect(plan.totalKm).toBeCloseTo(25, 1);
  });

  it('does nothing when fewer than two stops have a position', () => {
    const plan = planShift([stop('u1', null, at('08:00'), null), stop('p1', 0, at('09:00'), null), stop('u2', null, at('10:00'), null)], null, null);
    expect(plan.stops.map(s => s.id)).toEqual(['u1', 'p1', 'u2']);
    for (const s of plan.stops) {
      expect(s.order).toBeNull();
      expect(s.kmFromPrevious).toBeNull();
      expect(s.minutesFromPrevious).toBeNull();
      expect(s.warning).toBeNull();
    }
    expect(plan.totalKm).toBe(0);
  });

  it('keeps stops without a position in their original slot', () => {
    const plan = planShift([stop('a', 0, at('08:00'), at('09:00')), stop('u', null, at('09:00'), at('10:00')), stop('b', HALF_HOUR, at('10:00'), at('11:00'))], null, null);
    expect(plan.stops[1].id).toBe('u');
    expect(plan.stops[1].order).toBeNull();
    expect(plan.stops.filter(s => s.order !== null).length).toBe(2);
  });

  it('never produces NaN when end time is missing or the appointment time is malformed', () => {
    const plan = planShift([stop('s1', 0, at('09:00'), null), stop('s2', HALF_HOUR, 'not a date', null)], null, null);
    expect(minutesBetween(plan.stops[1].arrivalAt, at('10:30'))).toBeLessThan(1);
    expect(plan.stops[1].warning).toBeNull();
    expect(Number.isFinite(plan.totalKm)).toBe(true);
    for (const s of plan.stops) {
      if (s.kmFromPrevious !== null) expect(Number.isFinite(s.kmFromPrevious)).toBe(true);
      if (s.minutesFromPrevious !== null) expect(Number.isFinite(s.minutesFromPrevious)).toBe(true);
      if (s.arrivalAt !== null) expect(Number.isNaN(Date.parse(s.arrivalAt))).toBe(false);
    }
  });

  it('marks a first leg as "from the current position" only when it really is', () => {
    const morning = [stop('m1', HALF_HOUR, at('08:00'), at('09:00')), stop('m2', HALF_HOUR * 2, at('09:30'), at('10:30'))];
    const afternoon = [stop('a1', HALF_HOUR * 3, at('13:30'), at('14:30')), stop('a2', HALF_HOUR * 4, at('15:00'), at('16:00'))];
    const here = { lat: 0, lon: 0 };

    const [first, second] = planDay([morning, afternoon], here, null);
    expect(first.stops[0].legFromCurrent).toBe(true);
    expect(second.stops[0].legFromCurrent).toBe(false);

    const [, laterOnly] = planDay([[], afternoon], here, null);
    expect(laterOnly.stops[0].legFromCurrent).toBe(true);

    const [noStartFirst, noStartSecond] = planDay([morning, afternoon], null, null);
    expect(noStartFirst.stops[0].legFromCurrent).toBe(false);
    expect(noStartSecond.stops[0].legFromCurrent).toBe(false);
  });

  it('planDay starts each shift from where the previous shift ended', () => {
    const morning = [stop('m1', 0, at('08:00'), at('09:00')), stop('m2', HALF_HOUR, at('09:30'), at('10:30'))];
    const afternoon = [stop('a1', HALF_HOUR * 2, at('13:30'), at('14:30')), stop('a2', HALF_HOUR * 3, at('15:00'), at('16:00'))];
    const [first, second] = planDay([morning, afternoon], null, null);
    expect(first.stops[0].kmFromPrevious).toBeNull();
    expect(second.stops[0].kmFromPrevious).toBeCloseTo(12.5, 1);
    expect(second.stops.map(s => s.id)).toEqual(['a1', 'a2']);
  });
});

describe('mapsRouteUrl', () => {
  const params = (url: string | null) => new URL(url!).searchParams;

  it('uses the last address as destination and the earlier ones as waypoints', () => {
    const url = mapsRouteUrl(['A', 'B', 'C']);
    expect(url!.startsWith('https://www.google.com/maps/dir/')).toBe(true);
    expect(params(url).get('api')).toBe('1');
    expect(params(url).get('destination')).toBe('C');
    expect(params(url).get('waypoints')).toBe('A|B');
    expect(params(url).has('origin')).toBe(false);
  });

  it('a single address has no waypoints', () => {
    const q = params(mapsRouteUrl(['Only']));
    expect(q.get('destination')).toBe('Only');
    expect(q.has('waypoints')).toBe(false);
  });

  it('uses at most 10 addresses: 9 waypoints and a destination', () => {
    const list = Array.from({ length: 12 }, (_, i) => `addr${i + 1}`);
    const q = params(mapsRouteUrl(list));
    expect(q.get('waypoints')!.split('|')).toHaveLength(9);
    expect(q.get('destination')).toBe('addr10');
  });

  it('keeps Vietnamese text and commas intact', () => {
    const address = 'Học viện Ngân hàng, 12 Phố Chùa Bộc, Hà Nội';
    expect(params(mapsRouteUrl([address])).get('destination')).toBe(address);
  });

  it('returns null for no addresses', () => {
    expect(mapsRouteUrl([])).toBeNull();
  });
});
