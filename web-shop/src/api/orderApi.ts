import { Order, CreateOrderPayload, OrderStatus } from '../types/order';
import { customerRequest, CustomerApiError } from './customerClient';
import type {CheckoutSession} from './paymentApi';
export interface OrderPage { content: Order[]; page: number; size: number; totalElements: number; totalPages: number }
function adapt(row: any): Order {
  const snapshot = row.shippingAddressSnapshot;
  return { id: row.id, code: row.id, userId: row.userId, status: String(row.status).toUpperCase() as OrderStatus,
    items: (row.items || []).map((i: any) => ({ productId: i.productId, variantId: i.variantId, sku: i.sku, name: [i.productName, i.variantName].filter(Boolean).join(' · '), price: Number(i.unitPrice), quantity: i.quantity, image: '' })),
    shippingAddress: { fullName: snapshot?.recipientName || '', phone: snapshot?.phone || '', email: snapshot?.email || '', address: snapshot?.addressLine || row.shippingAddress || '', note: snapshot?.installationNote || '' },
    shippingFee: 0, subtotal: Number(row.total), total: Number(row.total), paymentMethod: row.payment?.provider==='vnpay'?'VNPAY':'BANK_TRANSFER', paymentStatus: row.paidAt ? 'PAID' : 'UNPAID',
    statusHistory: (row.statusHistory || []).map((h: any) => ({ status: String(h.status).toUpperCase() as OrderStatus, timestamp: h.timestamp, note: '' })),
    timeline: row.timeline || [], payment: row.payment || null, deliveryInstallation: row.deliveryInstallation || null, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
export const orderApi = {
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    if (payload.items.some(i => !i.variantId)) throw new Error('Giỏ hàng cũ chưa có phiên bản thiết bị hợp lệ. Vui lòng chọn lại sản phẩm.');
    const body = { items: payload.items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
      ...(payload.addressId ? { addressId: payload.addressId } : { shippingDetails: { label: 'Địa chỉ trên đơn', recipientName: payload.shippingAddress.fullName, phone: payload.shippingAddress.phone, addressLine: payload.shippingAddress.address, installationNote: payload.shippingAddress.note || '', isDefault: false } }) };
    return adapt(await customerRequest('/orders', { method: 'POST', body: JSON.stringify(body) }));
  },
  async checkout(id: string): Promise<CheckoutSession> {
    const storageKey = `smartbox_checkout_key:${id}`; let key = sessionStorage.getItem(storageKey);
    if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
    return customerRequest<CheckoutSession>(`/orders/${id}/checkout`, { method: 'POST', headers: { 'Idempotency-Key': key } });
  },
  async getMyOrders(page = 0): Promise<OrderPage> {
    const result = await customerRequest<any>(`/customer/orders?page=${page}&size=20`);
    return { ...result, content: result.content.map(adapt) };
  },
  async getOrderById(id: string): Promise<Order | null> {
    try { return adapt(await customerRequest(`/customer/orders/${id}`)); }
    catch (e) { if (e instanceof CustomerApiError && e.status === 404) return null; throw e; }
  },
  async cancelOrder(id: string, reason: string): Promise<Order> {
    await customerRequest(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
    const result = await this.getOrderById(id); if (!result) throw new Error('Không tải được trạng thái đơn.'); return result;
  }
};
