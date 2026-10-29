export interface Identity {
    userId: string;
    email: string;
    fullName: string;
    role: string;
    accessToken: string;
    refreshToken: string;
}
export interface Variant {
    id: string;
    productId: string;
    sku: string;
    variantName: string;
    size: string | null;
    capacityLiter: number | null;
    finalPrice: number | null;
    stockQuantity: number;
    isActive: boolean;
    modelTier?: string | null;
    widthCm?: number | null;
    heightCm?: number | null;
    depthCm?: number | null;
    weightKg?: number | null;
    maxLoadKg?: number | null;
    hasWeightSensor?: boolean | null;
    warrantyMonths?: number | null;
    images?: string[];
}
export interface CatalogProduct {
    id: string;
    categoryId?: string;
    categoryName?: string;
    categorySlug?: string;
    createdAt?: string;
    sku?: string;
    name: string;
    description: string;
    images: string[];
    isActive: boolean;
    price: number;
    variants?: Variant[];
}
export interface SnapshotItem {
    id: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}
export interface OrderView {
    id: string;
    orderId?: string;
    status: string;
    shippingAddress: string;
    total: number;
    subtotal?: number;
    discountAmount?: number;
    voucherCode?: string;
    itemApprovals?: { id: string; orderItemId: string; productName: string; sku: string; status: string; reason?: string }[];
    createdAt: string;
    expiresAt?: string;
    paidAt?: string;
    shippingAddressSnapshot?: { recipientName?: string; phone?: string; addressLine?: string; installationNote?: string };
    items: SnapshotItem[];
    ticket: Ticket[];
    shipment: {
        id: string;
        status: string;
        carrier?: string;
        tracking_number?: string;
    }[];
}
export interface Ticket {
    id: string;
    status: string;
    reason?: string;
    review_round?: number;
    history?: History[];
}
export interface History {
    id: string;
    to_status?: string;
    action?: string;
    reason?: string;
    created_at: string;
}
export interface Device {
    id: string;
    has_weight_sensor?: boolean;
    weight_kg?: number | null;
    serial_number: string;
    name?: string;
    status: string;
    door_status?: string;
    lock_status?: string;
    last_seen_at?: string;
    activated_at?: string;
}
export interface Notification {
    id: string;
    title: string;
    body: string;
    is_read: boolean;
    created_at: string;
}
const sessionKey = 'smartbox_session_v2';
export const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
export const demoPayment = import.meta.env.VITE_ENABLE_DEMO_PAYMENT === 'true';
export function session(): Identity | null { try {
    const value = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    return value?.accessToken && value?.userId ? value : null;
}
catch {
    return null;
} }
export function saveSession(value: Identity | null) { if (value)
    sessionStorage.setItem(sessionKey, JSON.stringify(value));
else
    sessionStorage.removeItem(sessionKey); window.dispatchEvent(new Event('smartbox-session')); }
export class ApiError extends Error {
    constructor(public status: number, message: string, public fields?: Record<string, string>, public traceId?: string) { super(message); }
}
let refreshing: Promise<void> | null = null;
let sessionGeneration = 0;
export function clearSession() { sessionGeneration++; saveSession(null); }
async function refresh() {
    if (!refreshing) {
        const current = session();
        const generation = sessionGeneration;
        refreshing = (async () => {
            if (!current?.refreshToken)
                throw new ApiError(401, 'Phiên đăng nhập đã hết hạn.');
            const next = await request<{
                accessToken: string;
                refreshToken?: string;
            }>('/auth/refresh-token', { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) }, false);
            if (generation === sessionGeneration && session()?.userId === current.userId)
                saveSession({ ...current, accessToken: next.accessToken, refreshToken: next.refreshToken || current.refreshToken });
        })().catch(error => { if (generation === sessionGeneration)
            clearSession(); throw error; }).finally(() => { refreshing = null; });
    }
    return refreshing;
}
export async function request<T>(path: string, options: RequestInit & { timeoutMs?: number } = {}, authenticated = true): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new ApiError(400, 'Đường dẫn API không hợp lệ.');
    if (path.startsWith('/mock-payment/')) {
        const mode = await request<{ provider: string; demoActionsEnabled: boolean }>('/payments/mode', { signal: options.signal }, false);
        if (mode.provider !== 'mock' || !mode.demoActionsEnabled) throw new ApiError(503, 'Máy chủ chưa bật thanh toán mô phỏng.');
    }
    const endpoint = `${baseUrl}${path}`;
    const send = async () => {
        const headers = new Headers(options.headers);
        if (options.body instanceof FormData) headers.delete('Content-Type');
        else if (options.body)
            headers.set('Content-Type', 'application/json');
        if (authenticated) {
            const token = session()?.accessToken;
            if (!token)
                throw new ApiError(401, 'Vui lòng đăng nhập để tiếp tục.');
            headers.set('Authorization', `Bearer ${token}`);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
        const abort = () => controller.abort();
        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.signal?.aborted)
            controller.abort();
        try {
            const { timeoutMs: _timeout, ...fetchOptions } = options;
            return await fetch(endpoint, { ...fetchOptions, headers, signal: controller.signal });
        }
        catch {
            throw new ApiError(0, 'Không thể kết nối hoặc yêu cầu đã hết thời gian. Với thao tác gửi dữ liệu, hãy kiểm tra lại trạng thái trước khi thử tiếp.');
        }
        finally {
            clearTimeout(timeout);
            options.signal?.removeEventListener('abort', abort);
        }
    };
    let response = await send();
    // Refresh once; never replay a mutation automatically (its outcome may be unknown).
    if (response.status === 401 && authenticated) {
        await refresh();
        if (!options.method || options.method === 'GET')
            response = await send();
    }
    const raw = await response.text();
    let body: any;
    try {
        body = raw ? JSON.parse(raw) : undefined;
    }
    catch {
        throw new ApiError(response.ok ? 502 : response.status, 'Máy chủ trả về dữ liệu không đúng định dạng.');
    }
    if (response.status === 401 && authenticated && (!options.method || options.method === 'GET')) clearSession();
    if (!response.ok)
        throw new ApiError(response.status, response.status === 403 ? 'Bạn không có quyền truy cập dữ liệu này.' : response.status === 429 ? 'Quá nhiều yêu cầu. Vui lòng chờ 60 giây.' : body?.message || `Yêu cầu thất bại (${response.status}).`, body?.data, response.headers.get('X-Trace-Id') || undefined);
    return body as T;
}
function normalizeVariant(row: Variant & { calculatedPrice?: number | null }, productId: string): Variant {
    return { ...row, productId: row.productId || productId, finalPrice: row.finalPrice ?? row.calculatedPrice ?? null };
}
export const shop = {
    categories: (signal?: AbortSignal) => request<{ id: string; name: string; slug: string }[]>('/products/categories', { signal }, false),
    product: (id: string, signal?: AbortSignal) => request<CatalogProduct>(`/products/${encodeURIComponent(id)}`, { signal }, false).then(p => ({ ...p, variants: p.variants?.map(v => normalizeVariant(v, p.id)) })),
    products: (signal?: AbortSignal) => request<CatalogProduct[]>('/products', { signal }, false).then(rows => rows.filter(p => p.isActive === true).map(p => ({ ...p, variants: p.variants?.map(v => normalizeVariant(v, p.id)).sort((a,b) => (a.capacityLiter ?? Infinity) - (b.capacityLiter ?? Infinity)) }))),
    variants: (id: string, signal?: AbortSignal) => request<(Variant & {
        calculatedPrice?: number | null;
    })[]>(`/products/${encodeURIComponent(id)}/variants`, { signal }, false).then(rows => rows.map(row => normalizeVariant(row, id)).sort((a,b) => (a.capacityLiter ?? Infinity) - (b.capacityLiter ?? Infinity))),
    async login(email: string, password: string) { const value = await request<Identity & {
        success?: boolean;
        message?: string;
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false); if (value.success === false || !value.accessToken || !value.userId)
        throw new ApiError(401, value.message || 'Phản hồi đăng nhập không hợp lệ.'); saveSession(value); return value; },
    async logout() { try {
        await request('/auth/logout', { method: 'POST' });
    }
    finally {
        clearSession();
    } },
    orders: (page = 0, signal?: AbortSignal) => request<OrderView[]>(`/orders/my-orders?page=${page}&size=20`, { signal }),
    order: (id: string, signal?: AbortSignal) => request<OrderView>(`/orders/${encodeURIComponent(id)}`, { signal }),
    history: (id: string, signal?: AbortSignal) => request<History[]>(`/orders/${encodeURIComponent(id)}/history`, { signal }),
    create: (shippingAddress: string, items: {
        variantId: string;
        quantity: number;
    }[]) => request<OrderView>('/orders', { method: 'POST', body: JSON.stringify({ shippingAddress, items }) }),
    checkout: (id: string, key: string) => request<{
        orderId: string;
        paymentId: string;
        status: string;
        paymentUrl: string;
        expiresAt: string;
    }>(`/orders/${id}/checkout`, { method: 'POST', headers: { 'Idempotency-Key': key } }),
    ticket: (id: string, signal?: AbortSignal) => request<Ticket>(`/tickets/${id}`, { signal }),
    resubmit: (id: string, reason: string) => request<Ticket>(`/tickets/${id}/resubmit`, { method: 'POST', body: JSON.stringify({ reason }) }),
    devices: (signal?: AbortSignal) => request<Device[]>('/devices/my-devices', { signal }),
    notifications: (signal?: AbortSignal) => request<Notification[]>('/notifications', { signal }),
};
export const money = (value: number | null | undefined) => value == null || !Number.isFinite(Number(value)) ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export const date = (value?: string) => { const zoned = value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value) ? `${value}+07:00` : value; return zoned && !Number.isNaN(Date.parse(zoned)) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(zoned)) : 'Chưa có dữ liệu'; };
export const statuses: Record<string, string> = { success: 'Thành công', failed: 'Thất bại', expired: 'Hết hạn', refund_required: 'Chờ hoàn tiền', refunded: 'Đã hoàn tiền', customer_decision_pending: 'Cần xác nhận sản phẩm được duyệt', PARTIALLY_REJECTED: 'Được duyệt một phần', CANCELLED: 'Đã hủy', pending: 'Chờ duyệt đơn', awaiting_payment: 'Chờ thanh toán', paid: 'Đã thanh toán', confirmed: 'Đã xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy', PENDING: 'Chờ xét duyệt', RETURNED: 'Cần giải trình', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
