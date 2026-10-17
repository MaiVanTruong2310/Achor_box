import { supabase } from './supabase';
import { adminRequest, AdminApiError } from './adminRequest';

export type JobStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED' | 'INSTALLED' | 'WAITING_PO_CONFIRMATION' | 'COMPLETED' | 'FAILED';

export interface JobSummary {
  id: string;
  orderId: string;
  assignedTo: string;
  status: JobStatus;
  scheduledAt: string;
  estimatedEndTime?: string | null;
  attempt: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  completionPhotos?: string[];
  completionNote?: string | null;
  reworkNotes?: string | null;
}

export interface Job extends JobSummary {
  orderStatus: string;
  startedAt: string | null;
  deliveredAt: string | null;
  installedAt: string | null;
  completedAt: string | null;
  installationNote?: string | null;
  failureReason?: string | null;
  customerAccepted: boolean;
  customer?: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
    shippingAddress: string | null;
    installationNote?: string | null;
  };
  items?: {
    id: string;
    quantity: number;
    productName: string | null;
    variantName: string | null;
    sku: string | null;
  }[];
  devices: {
    deviceId: string;
    serialNumber: string;
    orderItemId: string;
    hasWeightSensor: boolean;
  }[];
  history?: {
    actorId: string;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    attempt: number;
    version: number;
    createdAt: string;
  }[];
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Checks {
  recorded?: boolean;
  acceptedAt?: string;
  observedAt: string;
  jobId: string;
  attempt: number;
  version: number;
  serialComplete: boolean;
  ready: boolean;
  failedChecks: string[];
  devices: {
    deviceId: string;
    serialNumber: string;
    hasWeightSensor: boolean;
    checks: Record<'serialOwner' | 'connection' | 'unlock' | 'lock' | 'weight', boolean | null>;
    commands: {
      id: string;
      action: string;
      status: string;
      attempts: number;
      lastError: string | null;
      ackAt: string | null;
      expiresAt: string | null;
    }[];
  }[];
}

export interface TechnicianAvailability {
  id: string;
  fullName: string;
  phone: string;
  isAvailable: boolean;
  conflictReason: string | null;
  activeTasksCount: number;
}

export interface DailyTaskItem {
  id: string;
  quantity: number;
  productName: string | null;
  variantName: string | null;
  sku: string | null;
}

export interface DailyTaskDevice {
  deviceId: string;
  serialNumber: string;
  orderItemId: string;
}

export interface DailyTask {
  id: string;
  orderId: string | null;
  type: 'DELIVERY_INSTALLATION' | 'WARRANTY_MAINTENANCE';
  typeLabel: string;
  typeColor: 'indigo' | 'amber';
  referenceCode: string;
  orderCode: string;
  status: string;
  statusLabel: string;
  scheduledAt: string;
  estimatedEndTime: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shortAddress: string;
  installationNote: string | null;
  completionNote: string | null;
  completionPhotos: string[];
  reworkNotes: string | null;
  completedAt: string | null;
  items: DailyTaskItem[];
  devices: DailyTaskDevice[];
  version: number;
}

export interface DailyTasksResponse {
  date: string;
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    waitingConfirmation: number;
    completed: number;
  };
  tasks: DailyTask[];
}

export class DeliveryApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

// Unified request delegation with in-flight deduplication and token caching
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await adminRequest<T>(path, options);
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw new DeliveryApiError(error.message, error.status);
    }
    if (error instanceof DeliveryApiError) throw error;
    throw new DeliveryApiError('Chưa xác nhận được kết quả từ backend. Hãy tải lại trạng thái trước khi thử lại.', 0);
  }
}

export { request as backendRequest };

export const deliveryApi = {
  list: (mine: boolean, page: number, status: string) =>
    request<Page<JobSummary>>(`/delivery-installations${mine ? '/my-jobs' : ''}?page=${page}&size=20${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  detail: (id: string) => request<Job>(`/delivery-installations/${id}`),
  checks: (id: string) => request<Checks>(`/delivery-installations/${id}/checks`),
  technicians: () => request<{ id: string; fullName: string | null }[]>('/delivery-installations/technicians'),
  eligible: (page = 0) =>
    request<Page<{ id: string; shippingAddress: string | null; createdAt: string }>>(`/delivery-installations/eligible-orders?page=${page}&size=20`),
  forOrder: async (orderId: string): Promise<Job | null> => {
    try {
      return await request<Job>(`/orders/${orderId}/delivery-installation`);
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },
  assign: (orderId: string, body: unknown, key: string) =>
    request<Job>(`/orders/${orderId}/delivery-installation`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) }),
  mutate: (job: Job, action: string, body: unknown, key: string) =>
    request<Job | { commandId: string; status: string; jobVersion: number }>(`/delivery-installations/${job.id}/${action}`, {
      method: 'POST',
      headers: { 'If-Match': String(job.version), 'Idempotency-Key': key },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  availability: (start: string, end?: string) =>
    request<TechnicianAvailability[]>(`/delivery-installations/availability?start=${encodeURIComponent(start)}${end ? `&end=${encodeURIComponent(end)}` : ''}`),
  submitCompletion: (id: string, body: { proofPhotos: string[]; completionNote?: string }, version: number, key: string) =>
    request<Job>(`/delivery-installations/${id}/submit-completion`, {
      method: 'POST',
      headers: { 'If-Match': String(version), 'Idempotency-Key': key },
      body: JSON.stringify(body),
    }),
  approveCompletion: (id: string, body: { approvalNote?: string } = {}, version: number, key: string) =>
    request<Job>(`/delivery-installations/${id}/approve-completion`, {
      method: 'POST',
      headers: { 'If-Match': String(version), 'Idempotency-Key': key },
      body: JSON.stringify(body),
    }),
  rejectCompletion: (id: string, body: { reason: string }, version: number, key: string) =>
    request<Job>(`/delivery-installations/${id}/reject-completion`, {
      method: 'POST',
      headers: { 'If-Match': String(version), 'Idempotency-Key': key },
      body: JSON.stringify(body),
    }),
  dailyTasks: (date?: string, technicianId?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (technicianId) params.append('technicianId', technicianId);
    const qs = params.toString();
    return request<DailyTasksResponse>(`/technician/daily-tasks${qs ? `?${qs}` : ''}`);
  },
  uploadProof: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string }>('/delivery-installations/upload-proof', {
      method: 'POST',
      body: formData,
    });
  },
};

