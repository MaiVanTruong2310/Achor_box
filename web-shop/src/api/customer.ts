import { request, type OrderView } from './shop';
export interface Profile { id: string; fullName: string; email: string; phone: string | null; createdAt: string }
export interface AddressInput { label: string; recipientName: string; phone: string; addressLine: string; installationNote: string; isDefault: boolean }
export interface Address extends AddressInput { id: string }
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface TimelineEvent { id: string; source: string; action: string; occurredAt: string; attempt?: number }
export interface Installation { id: string; orderId: string; status: string; attempt: number; scheduledAt: string | null; startedAt: string | null; deliveredAt: string | null; installedAt: string | null; completedAt: string | null; customerAccepted: boolean; devices: { deviceId: string; serialNumber: string; hasWeightSensor: boolean }[] }
export interface PaymentSummary { id: string; provider: string; status: string; amount: number; paidAt?: string; expiresAt?: string; isSimulated: boolean; refund?: { status: string; amount: number; completedAt?: string } | null }
export interface CustomerOrder extends OrderView { payment: PaymentSummary | null; deliveryInstallation: Installation | null; timeline: TimelineEvent[] }
export interface WarrantyRecord { id: string; deviceId: string; serialNumber: string; orderId: string; startDate: string; endDate: string; status: string; durationMonths: number; acceptedAt: string }
export interface WarrantyClaim { id: string; warrantyId: string; serialNumber: string; description: string; status: string; images: string[]; createdAt: string; resolvedAt?: string }
const pathId = (value: string) => encodeURIComponent(value);
export function claimPage(value: { content: WarrantyClaim[]; currentPage: number; pageSize: number; totalElements: number; totalPages: number }): Page<WarrantyClaim> { return { content: value.content, page: value.currentPage, size: value.pageSize, totalElements: value.totalElements, totalPages: value.totalPages }; }
export const customer = {
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => request<{ message: string; requiresLogin: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }, false),
  forgot: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }, false),
  reset: (tokenHash: string, newPassword: string) => request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ tokenHash, newPassword }) }, false),
  changePassword: (currentPassword: string, newPassword: string) => request<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  profile: (signal?: AbortSignal) => request<Profile>('/customer/profile', { signal }),
  updateProfile: (fullName: string, phone: string) => request<Profile>('/customer/profile', { method: 'PUT', body: JSON.stringify({ fullName, phone }) }),
  addresses: (signal?: AbortSignal) => request<Address[]>('/customer/addresses', { signal }),
  saveAddress: (data: AddressInput, id?: string) => request<Address>(`/customer/addresses${id ? `/${pathId(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deleteAddress: (id: string) => request<void>(`/customer/addresses/${pathId(id)}`, { method: 'DELETE' }),
  orders: (page = 0, signal?: AbortSignal) => request<Page<CustomerOrder>>(`/customer/orders?page=${page}&size=20`, { signal }),
  order: (id: string, signal?: AbortSignal) => request<CustomerOrder>(`/customer/orders/${pathId(id)}`, { signal }),
  createOrder: (address: { addressId: string } | { shippingDetails: AddressInput }, items: { variantId: string; quantity: number }[], couponCode?: string) => request<OrderView>('/orders', { method: 'POST', body: JSON.stringify({ ...address, items, ...(couponCode ? { couponCode } : {}) }) }),
  timeline: (id: string, signal?: AbortSignal) => request<{ orderId: string; orderStatus: string; events: TimelineEvent[] }>(`/orders/${pathId(id)}/timeline`, { signal }),
  warranties: (page = 0, signal?: AbortSignal) => request<Page<WarrantyRecord>>(`/customer/warranties?page=${page}&size=20`, { signal }),
  claims: (page = 0, signal?: AbortSignal) => request<Parameters<typeof claimPage>[0]>(`/customer/warranty-claims?page=${page}&size=20`, { signal }).then(claimPage),
  claim: (id: string, signal?: AbortSignal) => request<WarrantyClaim>(`/customer/warranty-claims/${pathId(id)}`, { signal }),
  uploadImage: (warrantyId: string, file: File) => { const body = new FormData(); body.append('file', file); return request<{ id: string; url: string }>(`/customer/warranties/${pathId(warrantyId)}/images`, { method: 'POST', body, timeoutMs: 45000 }); },
  createClaim: (warrantyId: string, description: string, imageIds: string[], key: string) => request<WarrantyClaim>('/customer/warranty-claims', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ warrantyId, description, imageIds }) }),
};
export const jobLabels: Record<string, string> = { ASSIGNED: 'Đã phân công', IN_PROGRESS: 'Đang thực hiện', DELIVERED: 'Đã giao', INSTALLED: 'Đã lắp đặt', COMPLETED: 'Đã nghiệm thu', WAITING_PO_CONFIRMATION: 'Chờ duyệt nghiệm thu', FAILED: 'Cần xử lý lại', COMPLETION_PENDING: 'Chờ duyệt nghiệm thu', PENDING_APPROVAL: 'Chờ duyệt nghiệm thu', REJECTED: 'Cần bổ sung nghiệm thu' };
export const claimLabels: Record<string, string> = { new: 'Đã tiếp nhận', assigned: 'Đã phân công', in_progress: 'Đang xử lý', resolved: 'Đã xử lý', rejected: 'Từ chối' };
export function warrantyEligible(record: WarrantyRecord) { const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return record.status === 'active' && record.startDate <= today && today <= record.endDate; }
