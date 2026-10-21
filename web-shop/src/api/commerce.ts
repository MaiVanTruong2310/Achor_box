import { request, type OrderView, type Ticket } from './shop';
import type { CustomerOrder } from './customer';
export interface Pricing { subtotal: number; discountAmount: number; shippingFee: number; finalTotal: number; voucherCode: string | null; voucherApplied: boolean; voucherMessage: string | null; itemDetails: { variantId: string; productName: string; sku: string; unitPrice: number; quantity: number; itemTotal: number; inStock: boolean }[] }
export const commerce = {
  pricing: (items: { variantId: string; quantity: number }[], voucherCode = '', signal?: AbortSignal) => request<Pricing>('/pricing/calculate', { method: 'POST', body: JSON.stringify({ items, voucherCode: voucherCode.trim() || undefined }), signal }, false),
  ticket: (id: string, signal?: AbortSignal) => request<Partial<Ticket>>(`/orders/${encodeURIComponent(id)}/ticket`, { signal }),
  decision: (id: string, accept: boolean) => request<OrderView>(`/orders/${encodeURIComponent(id)}/customer-decision`, { method: 'POST', body: JSON.stringify({ accept }) }),
};
export function checkoutAction(order: Pick<CustomerOrder, 'status' | 'payment'>): 'create' | 'resume' | 'blocked' {
  if (order.status !== 'awaiting_payment') return 'blocked';
  return order.payment?.status === 'pending' ? 'resume' : 'create';
}
export function canSubmitQuote(value?: Pricing | null, coupon = ''): boolean {
  return !!value && Number.isFinite(value.finalTotal) && value.finalTotal > 0 && value.itemDetails.length > 0 && value.itemDetails.every(item => item.inStock && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99) && (!coupon.trim() || value.voucherApplied);
}
