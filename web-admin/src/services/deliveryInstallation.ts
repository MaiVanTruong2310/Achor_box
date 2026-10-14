import { supabase } from './supabase';

export type JobStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED' | 'INSTALLED' | 'COMPLETED' | 'FAILED';
export interface JobSummary { id: string; orderId: string; assignedTo: string; status: JobStatus; scheduledAt: string; attempt: number; version: number; createdAt: string; updatedAt: string }
export interface Job extends JobSummary {
  orderStatus: string;
  startedAt: string | null; deliveredAt: string | null; installedAt: string | null; completedAt: string | null;
  installationNote?: string | null; failureReason?: string | null; customerAccepted: boolean;
  customer?: { fullName: string | null; phone: string | null; email: string | null; shippingAddress: string | null; installationNote?: string | null };
  items?: { id: string; quantity: number; productName: string | null; variantName: string | null; sku: string | null }[];
  devices: { deviceId: string; serialNumber: string; orderItemId: string; hasWeightSensor: boolean }[];
  history?: { actorId: string; action: string; fromStatus: string | null; toStatus: string; reason: string | null; attempt: number; version: number; createdAt: string }[];
}
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface Checks {
  recorded?: boolean; acceptedAt?: string; observedAt: string;
  jobId: string; attempt: number; version: number; serialComplete: boolean; ready: boolean; failedChecks: string[];
  devices: { deviceId: string; serialNumber: string; hasWeightSensor: boolean; checks: Record<'serialOwner' | 'connection' | 'unlock' | 'lock' | 'weight', boolean | null>; commands: { id: string; action: string; status: string; attempts: number; lastError: string | null; ackAt: string | null; expiresAt: string | null }[] }[];
}
export class DeliveryApiError extends Error { constructor(message: string, public readonly status: number) { super(message); } }
const base = (import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

// This module never falls back to direct database writes or simulated success.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new DeliveryApiError('Vui lòng đăng nhập lại để truy cập công việc.', 401);
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    let body: unknown = null;
    if (text) { try { body = JSON.parse(text); } catch { throw new DeliveryApiError('Backend trả phản hồi không hợp lệ.', response.status); } }
    if (!response.ok) {
      if (response.status === 401) window.dispatchEvent(new CustomEvent('smartbox:auth-expired'));
      const message = typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : `Không xử lý được yêu cầu (${response.status}).`;
      throw new DeliveryApiError(message, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof DeliveryApiError) throw error;
    throw new DeliveryApiError('Chưa xác nhận được kết quả từ backend. Hãy tải lại trạng thái trước khi thử lại.', 0);
  } finally { clearTimeout(timer); }
}
export { request as backendRequest };
export const deliveryApi = {
  list: (mine: boolean, page: number, status: string) => request<Page<JobSummary>>(`/delivery-installations${mine ? '/my-jobs' : ''}?page=${page}&size=20${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  detail: (id: string) => request<Job>(`/delivery-installations/${id}`),
  checks: (id: string) => request<Checks>(`/delivery-installations/${id}/checks`),
  technicians: () => request<{ id: string; fullName: string | null }[]>('/delivery-installations/technicians'),
  eligible: (page = 0) => request<Page<{ id: string; shippingAddress: string | null; createdAt: string }>>(`/delivery-installations/eligible-orders?page=${page}&size=20`),
  assign: (orderId: string, body: unknown, key: string) => request<Job>(`/orders/${orderId}/delivery-installation`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) }),
  mutate: (job: Job, action: string, body: unknown, key: string) => request<Job | { commandId: string; status: string; jobVersion: number }>(`/delivery-installations/${job.id}/${action}`, { method: 'POST', headers: { 'If-Match': String(job.version), 'Idempotency-Key': key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
};
