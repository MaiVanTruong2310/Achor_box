// Ties geocoding and route planning together for one day of technician tasks.
// Spec: docs/superpowers/specs/2026-11-09-technician-route-order-design.md

import type { DailyTask } from './deliveryInstallation';
import type { createGeocoder } from './routeGeocode';
import { planDay, type LatLon, type RouteStop, type ShiftPlan } from './routePlanner';

export type ShiftId = 'morning' | 'afternoon' | 'evening';
const SHIFT_ORDER: ShiftId[] = ['morning', 'afternoon', 'evening'];
/** Nothing left to visit: done, or the proof is already submitted and waiting for the PO. */
const FINISHED = new Set(['COMPLETED', 'RESOLVED', 'WAITING_PO_CONFIRMATION']);
export const isRouteFinished = (status: string): boolean => FINISHED.has(status);
const POSITION_TIMEOUT_MS = 8000;

export interface DayRoute {
  plans: Record<ShiftId, ShiftPlan>;
  /** Ids of tasks whose address could not be placed on the map. */
  unlocated: string[];
  startedFromCurrentPosition: boolean;
  geocoded: Map<string, LatLon | null>;
}

export interface PlanDayRouteInput {
  shiftTasks: Record<ShiftId, DailyTask[]>;
  geocoder: Pick<ReturnType<typeof createGeocoder>, 'geocodeAll'>;
  getPosition: () => Promise<LatLon | null>;
  /** Only pass a value when the plan is for today; later shifts cannot start before it. */
  nowMs: number | null;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export const addressOf = (task: DailyTask) => (task.shippingAddress ?? '').trim() || (task.shortAddress ?? '').trim();

function byAppointment(a: DailyTask, b: DailyTask): number {
  const x = Date.parse(a.scheduledAt);
  const y = Date.parse(b.scheduledAt);
  return (Number.isFinite(x) ? x : Infinity) - (Number.isFinite(y) ? y : Infinity) || 0;
}

function positionWithTimeout(getPosition: () => Promise<LatLon | null>): Promise<LatLon | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), POSITION_TIMEOUT_MS);
    getPosition().then(
      value => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

export async function planDayRoute(input: PlanDayRouteInput): Promise<DayRoute> {
  const { signal } = input;
  if (signal?.aborted) throw abortError();

  const active = {} as Record<ShiftId, DailyTask[]>;
  for (const shift of SHIFT_ORDER) {
    active[shift] = input.shiftTasks[shift].filter(task => !isRouteFinished(task.status)).sort(byAppointment);
  }
  const addresses = [...new Set(SHIFT_ORDER.flatMap(shift => active[shift].map(addressOf)).filter(Boolean))];

  const [geocoded, position] = await Promise.all([
    input.geocoder.geocodeAll(addresses, (done, total) => input.onProgress?.(done, total), signal),
    positionWithTimeout(input.getPosition),
  ]);
  if (signal?.aborted) throw abortError();

  const unlocated: string[] = [];
  const stopsByShift = SHIFT_ORDER.map(shift =>
    active[shift].map<RouteStop>(task => {
      const point = geocoded.get(addressOf(task)) ?? null;
      if (!point) unlocated.push(task.id);
      return { id: task.id, point, scheduledAt: task.scheduledAt, estimatedEndTime: task.estimatedEndTime || null };
    }),
  );

  const [morning, afternoon, evening] = planDay(stopsByShift, position, input.nowMs);
  return {
    plans: { morning, afternoon, evening },
    unlocated,
    startedFromCurrentPosition: position !== null,
    geocoded,
  };
}

/**
 * Identifies the data a plan was made for. When it changes (date, status filter, or any task's
 * status, appointment time or address) the plan is stale and must be dropped.
 */
export function makeRouteKey(date: string, tasks: DailyTask[], filter: string): string {
  const rows = tasks.map(task => [task.id, task.status, task.scheduledAt, addressOf(task)].join('~')).sort();
  return `${date}|${filter}|${rows.join(',')}`;
}
