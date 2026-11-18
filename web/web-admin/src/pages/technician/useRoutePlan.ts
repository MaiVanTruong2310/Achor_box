import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyTask } from '../../services/deliveryInstallation';
import type { LatLon } from '../../services/routePlanner';
import { createGeocoder } from '../../services/routeGeocode';
import { planDayRoute, type DayRoute, type ShiftId } from '../../services/routeSession';

export type RoutePlanStatus = 'idle' | 'running' | 'ready' | 'error';

interface RouteState {
  status: RoutePlanStatus;
  progress: { done: number; total: number };
  route: DayRoute | null;
  message: string;
}

const IDLE: RouteState = { status: 'idle', progress: { done: 0, total: 0 }, route: null, message: '' };

/** The browser's position, or null when unavailable or refused. Never rejects. */
function currentPosition(): Promise<LatLon | null> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    );
  });
}

/**
 * Suggested route for the selected day. `resetKey` identifies the data the plan was made for
 * (date plus the tasks and their statuses): when it changes, any running work is cancelled and
 * the plan is dropped so a stale order is never shown.
 */
export function useRoutePlan(shiftTasks: Record<ShiftId, DailyTask[]>, resetKey: string, isToday: boolean) {
  const [state, setState] = useState<RouteState>(IDLE);
  const geocoder = useMemo(() => createGeocoder(), []);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef({ shiftTasks, isToday });
  latest.current = { shiftTasks, isToday };

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  useEffect(() => {
    cancel();
    setState(IDLE);
  }, [resetKey, cancel]);

  useEffect(() => cancel, [cancel]);

  const run = useCallback(() => {
    cancel();
    const mine = new AbortController();
    controller.current = mine;
    setState({ ...IDLE, status: 'running' });
    planDayRoute({
      shiftTasks: latest.current.shiftTasks,
      geocoder,
      getPosition: currentPosition,
      nowMs: latest.current.isToday ? Date.now() : null,
      signal: mine.signal,
      onProgress: (done, total) => {
        if (!mine.signal.aborted) setState(s => (s.status === 'running' ? { ...s, progress: { done, total } } : s));
      },
    }).then(
      route => { if (!mine.signal.aborted) setState({ status: 'ready', progress: { done: 0, total: 0 }, route, message: '' }); },
      error => {
        if (mine.signal.aborted || (error as Error)?.name === 'AbortError') return;
        setState({ ...IDLE, status: 'error', message: 'Chưa sắp xếp được tuyến. Hãy thử lại.' });
      },
    );
  }, [cancel, geocoder]);

  const undo = useCallback(() => {
    cancel();
    setState(IDLE);
  }, [cancel]);

  return { ...state, run, undo };
}
