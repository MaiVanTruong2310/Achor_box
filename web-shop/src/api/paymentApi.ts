import { customerRequest } from './customerClient';
export interface PaymentMode { provider: string; environment?: string; isSimulated: boolean; demoActionsEnabled: boolean }
export interface PaymentInfo { id: string; provider: string; environment?: string; transactionRef?: string; status: string; isSimulated: boolean; amount: number; paidAt: string | null; expiresAt: string | null; refund: { status: string; amount: number; completedAt: string | null } | null }
export interface CheckoutSession {orderId:string;paymentId:string;provider:string;environment?:string;paymentUrl:string;expiresAt:string}
export function paymentLabel(payment:Pick<PaymentMode,'provider'|'environment'|'isSimulated'>){return payment.provider==='vnpay'&&payment.environment==='sandbox'?'VNPAY Sandbox — giao dịch kiểm thử, không thu tiền thật':payment.isSimulated?'Giả lập phục vụ đồ án — không thu tiền thật':payment.provider;}
export function redirectToPayment(session:CheckoutSession):boolean {
  if(session.provider!=='vnpay')return false;
  const url=new URL(session.paymentUrl);
  if(session.environment!=='sandbox'||url.protocol!=='https:'||url.host!=='sandbox.vnpayment.vn'||url.pathname!=='/paymentv2/vpcpay.html'||url.username||url.password)throw new Error('Liên kết VNPAY không hợp lệ.');
  if(!Number.isFinite(Date.parse(session.expiresAt))||Date.parse(session.expiresAt)<=Date.now())throw new Error('Liên kết thanh toán đã hết hạn.');
  window.location.assign(url.href);return true;
}
export const PAYMENT_LABELS: Record<string,string> = { pending: 'Chờ thanh toán', success: 'Thanh toán thành công', failed: 'Thanh toán thất bại', expired: 'Đã hết hạn hoặc bị hủy', refund_required: 'Chờ hoàn tiền', refunded: 'Đã ghi nhận hoàn tiền' };
export const paymentApi = {
  mode: () => customerRequest<PaymentMode>('/payments/mode', {}, false),
  simulate: (id: string, result: 'SUCCESS' | 'FAILED') => customerRequest<{ acknowledged: boolean }>(`/mock-payment/payments/${id}/complete?result=${result}`, { method: 'POST' }),
  session:(orderId:string)=>customerRequest<CheckoutSession>(`/orders/${orderId}/payment-session`),
  verifyReturn:(query:URLSearchParams)=>customerRequest<{paymentId:string;gatewayResult:string;environment:string}>(`/payments/vnpay/return?${query}`,{},false),
  orderForPayment:(id:string)=>customerRequest<any>(`/customer/orders/by-payment/${id}`)
};
