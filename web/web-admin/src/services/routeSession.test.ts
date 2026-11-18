import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRouteFinished, makeRouteKey, planDayRoute, type ShiftId } from './routeSession';
import type { DailyTask } from './deliveryInstallation';
import type { LatLon } from './routePlanner';

const at = (hhmm: string) => `2026-11-10T${hhmm}:00+07:00`;
const task = (id: string, address: string, scheduled = '09:00', status = 'ASSIGNED') =>
  ({ id, status, scheduledAt: at(scheduled), estimatedEndTime: at('10:00'), shippingAddress: address, shortAddress: address } as unknown as DailyTask);
const day = (morning: DailyTask[], afternoon: DailyTask[] = [], evening: DailyTask[] = []): Record<ShiftId, DailyTask[]> => ({ morning, afternoon, evening });
const geo = (table: Record<string, LatLon | null>, progress: Array<[number, number]> = [], asked: string[][] = []) => ({
  geocodeAll: async (addresses: string[], onProgress: (done: number, total: number) => void) => {
    asked.push(addresses);
    const map = new Map<string, LatLon | null>();
    addresses.forEach((a, i) => { map.set(a, table[a] ?? null); onProgress(i + 1, addresses.length); progress.push([i + 1, addresses.length]); });
    return map;
  },
});
const noPosition = async () => null;

afterEach(() => vi.useRealTimers());

describe('planDayRoute', () => {
  it('leaves completed tasks out of the plan', async () => {
    const route = await planDayRoute({
      shiftTasks: day([task('t1', 'A'), task('t2', 'B', '09:30', 'COMPLETED'), task('t3', 'C', '10:00')]),
      geocoder: geo({ A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0.1 }, C: { lat: 0, lon: 0.2 } }),
      getPosition: noPosition, nowMs: null,
    });
    expect(route.plans.morning.stops.map(s => s.id).sort()).toEqual(['t1', 't3']);
  });

  it('lists tasks it could not place and keeps them in their slot', async () => {
    const route = await planDayRoute({
      shiftTasks: day([task('t1', 'A', '08:00'), task('t2', 'lost', '09:00'), task('t3', 'C', '10:00')]),
      geocoder: geo({ A: { lat: 0, lon: 0 }, C: { lat: 0, lon: 0.2 } }),
      getPosition: noPosition, nowMs: null,
    });
    expect(route.unlocated).toEqual(['t2']);
    expect(route.plans.morning.stops[1].id).toBe('t2');
    expect(route.plans.morning.stops[1].order).toBeNull();
  });

  it('does not reorder or throw when no address can be placed', async () => {
    const route = await planDayRoute({
      shiftTasks: day([task('t1', 'x'), task('t2', 'y', '10:00')]),
      geocoder: geo({}), getPosition: noPosition, nowMs: null,
    });
    expect(route.plans.morning.stops.map(s => s.id)).toEqual(['t1', 't2']);
    expect(route.plans.morning.stops.every(s => s.order === null)).toBe(true);
    expect(route.unlocated.sort()).toEqual(['t1', 't2']);
  });

  it('starts from the current position when it is known and picks the nearest stop first', async () => {
    const route = await planDayRoute({
      shiftTasks: day([task('far', 'F', '08:00'), task('near', 'N', '09:00')]),
      geocoder: geo({ F: { lat: 0, lon: 0.3 }, N: { lat: 0, lon: 0.1 } }),
      getPosition: async () => ({ lat: 0, lon: 0 }), nowMs: null,
    });
    expect(route.startedFromCurrentPosition).toBe(true);
    expect(route.plans.morning.stops[0].id).toBe('near');
    expect(route.plans.morning.stops[0].order).toBe(1);
  });

  it('falls back to the first stop by time when no position is available', async () => {
    const route = await planDayRoute({
      shiftTasks: day([task('first', 'F', '08:00'), task('second', 'S', '09:00')]),
      geocoder: geo({ F: { lat: 0, lon: 0.3 }, S: { lat: 0, lon: 0.1 } }),
      getPosition: noPosition, nowMs: null,
    });
    expect(route.startedFromCurrentPosition).toBe(false);
    expect(route.plans.morning.stops[0].id).toBe('first');
  });

  it('does not wait more than 8 seconds for the position', async () => {
    vi.useFakeTimers();
    const pending = planDayRoute({
      shiftTasks: day([task('a', 'A'), task('b', 'B', '10:00')]),
      geocoder: geo({ A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0.1 } }),
      getPosition: () => new Promise<LatLon | null>(() => {}), nowMs: null,
    });
    await vi.advanceTimersByTimeAsync(8000);
    const route = await pending;
    expect(route.startedFromCurrentPosition).toBe(false);
  });

  it('rejects with an AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(planDayRoute({
      shiftTasks: day([task('a', 'A'), task('b', 'B', '10:00')]),
      geocoder: geo({}), getPosition: noPosition, nowMs: null, signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('asks the geocoder once per distinct address and forwards progress', async () => {
    const asked: string[][] = [];
    const progress: Array<[number, number]> = [];
    const seen: Array<[number, number]> = [];
    await planDayRoute({
      shiftTasks: day([task('a', 'Same'), task('b', 'Same', '10:00')], [task('c', 'Other', '14:00')]),
      geocoder: geo({}, progress, asked), getPosition: noPosition, nowMs: null,
      onProgress: (done, total) => seen.push([done, total]),
    });
    expect(asked[0].sort()).toEqual(['Other', 'Same']);
    expect(seen).toEqual(progress);
  });
});

describe('tasks that no longer need a visit', () => {
  it('treats a task waiting for PO confirmation as done', async () => {
    const route = await planDayRoute({
      shiftTasks: day([task('t1', 'A', '08:00'), task('t2', 'B', '09:00', 'WAITING_PO_CONFIRMATION'), task('t3', 'C', '10:00')]),
      geocoder: geo({ A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0.1 }, C: { lat: 0, lon: 0.2 } }),
      getPosition: noPosition, nowMs: null,
    });
    expect(route.plans.morning.stops.map(s => s.id).sort()).toEqual(['t1', 't3']);
  });

  it('isRouteFinished covers completed, resolved and waiting-for-PO only', () => {
    for (const status of ['COMPLETED', 'RESOLVED', 'WAITING_PO_CONFIRMATION']) expect(isRouteFinished(status)).toBe(true);
    for (const status of ['ASSIGNED', 'NEW', 'IN_PROGRESS', 'DELIVERED', 'INSTALLED']) expect(isRouteFinished(status)).toBe(false);
  });
});

describe('makeRouteKey', () => {
  const tasks = [task('t1', 'A', '09:00'), task('t2', 'B', '10:00')];
  const key = (list = tasks, date = '2026-11-10', filter = 'ALL') => makeRouteKey(date, list, filter);

  it('is the same for the same data in any order', () => {
    expect(key([...tasks].reverse())).toBe(key());
  });

  it('changes with the date and with the status filter', () => {
    expect(key(tasks, '2026-11-11')).not.toBe(key());
    expect(key(tasks, '2026-11-10', 'PENDING')).not.toBe(key());
  });

  it('changes when a task changes status, moves in time or changes address', () => {
    expect(key([task('t1', 'A', '09:00', 'IN_PROGRESS'), tasks[1]])).not.toBe(key());
    expect(key([task('t1', 'A', '15:00'), tasks[1]])).not.toBe(key());
    expect(key([task('t1', 'Somewhere else', '09:00'), tasks[1]])).not.toBe(key());
  });
});
