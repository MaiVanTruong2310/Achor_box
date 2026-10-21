import { request } from './shop';
export interface PaymentMode { provider: string; environment: string; isSimulated: boolean; demoActionsEnabled: boolean }
export interface PaymentSession extends PaymentMode { orderId: string; paymentId: string; paymentUrl: string; expiresAt: string }
export interface SalesInvoice { invoiceNumber: string; orderId: string; issuedAt: string; html: string }
export const paymentApi = {
  mode: (signal?: AbortSignal) => request<PaymentMode>('/payments/mode', { signal }, false),
  session: (id: string, signal?: AbortSignal) => request<PaymentSession>(`/orders/${encodeURIComponent(id)}/payment-session`, { signal }),
  checkout: (id: string, key: string) => request<PaymentSession>(`/orders/${encodeURIComponent(id)}/checkout`, { method: 'POST', headers: { 'Idempotency-Key': key } }),
  invoice: (id: string, signal?: AbortSignal) => request<SalesInvoice>(`/orders/${encodeURIComponent(id)}/sales-invoice`, { signal }),
};
export function paymentDestination(value: PaymentSession): string {
  if (value.provider === 'mock' && value.demoActionsEnabled) return `/demo-payment/${encodeURIComponent(value.paymentId)}`;
  const url = new URL(value.paymentUrl);
  if (value.provider === 'vnpay' && value.environment === 'sandbox' && url.protocol === 'https:' && url.hostname === 'sandbox.vnpayment.vn' && !url.username && !url.password && !url.port) return url.href;
  throw new Error('Phiên thanh toán không có địa chỉ hợp lệ. Vui lòng kiểm tra lại đơn hàng.');
}
