import { Phone } from 'lucide-react';
import { consultationPhone } from '../contact';
import { paymentApi } from '../api/payment';
import { Link, useParams } from 'react-router-dom';
import { date, money, request } from '../api/shop';
import { ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
import { useShop } from '../ShopContext';
import { useState } from 'react';

export function Contact() {
  return <section className="container section contact-page">
    <p className="eyebrow">LIÊN HỆ ANCHORBOX</p>
    <h1>Tư vấn trước khi chọn.<br/>Hỗ trợ khi bạn cần.</h1>
    <div className="panel consultation-panel" aria-labelledby="consultation-heading">
      <div>
        <p className="eyebrow">TƯ VẤN QUA ĐIỆN THOẠI</p>
        <h2 id="consultation-heading">Cùng bạn chọn hộp phù hợp.</h2>
        <p className="muted">Liên hệ để được tư vấn lựa chọn sản phẩm, cách đặt hàng và thông tin giao hàng, lắp đặt.</p>
      </div>
      <div className="consultation-actions">
        <a className="consultation-number" href={consultationPhone.href} aria-label={`Gọi tư vấn ${consultationPhone.display}`}>{consultationPhone.display}</a>
        <a className="button" href={consultationPhone.href}><Phone size={19} aria-hidden="true"/>Gọi tư vấn ngay</a>
        <p className="muted">Bấm để gọi hoặc lưu số điện thoại để liên hệ khi cần.</p>
      </div>
    </div>
    <h2>Tra cứu và hỗ trợ sau mua hàng</h2>
    <div className="product-grid">
      <Link className="panel" to="/account/orders"><h3>Đơn hàng &amp; giao nhận</h3><p>Xem kết quả xét duyệt, thanh toán và tiến trình giao hàng.</p></Link>
      <Link className="panel" to="/account/warranty"><h3>Bảo hành thiết bị</h3><p>Kiểm tra thời hạn và gửi yêu cầu kèm ảnh sự cố.</p></Link>
      <Link className="panel" to="/faq"><h3>Câu hỏi thường gặp</h3><p>Tìm hiểu sản phẩm và cách đặt hàng.</p></Link>
    </div>
  </section>;
}

interface DemoPaymentRow { id: string; order_id: string; amount: number; status: string; expires_at: string }
export function DemoPayment() {
  const { paymentId = '' } = useParams(); const { user } = useShop();
  const mode = useResource(paymentApi.mode, 'payment-mode');
  const demoPayment = !!mode.data?.demoActionsEnabled && mode.data.provider === 'mock' && !mode.error;
  const resource = useResource(async signal => { const current = await paymentApi.mode(signal); return current.provider === 'mock' && current.demoActionsEnabled ? request<DemoPaymentRow>(`/mock-payment/payments/${encodeURIComponent(paymentId)}`, { signal }) : null; }, `${user?.userId}:${paymentId}`);
  const [error, setError] = useState<Error>(); const [busy, setBusy] = useState(false); const [unknown, setUnknown] = useState(false);
  async function complete(result: string) { if (busy || !demoPayment) return; setBusy(true); setError(undefined); try { await request(`/mock-payment/payments/${encodeURIComponent(paymentId)}/complete?result=${result}`, { method: 'POST' }); resource.retry(); } catch (reason) { setError(reason as Error); setUnknown(true); resource.retry(); } finally { setBusy(false); } }
  return <section className="container section"><p className="eyebrow">CHỈ MÔI TRƯỜNG DEMO</p><h1>Thanh toán mô phỏng.</h1><p className="notice">Đây là công cụ thử luồng thanh toán với backend demo. Không có giao dịch tiền thật.</p>{!demoPayment ? <><ResourceState {...mode}/>{!mode.loading && !mode.error && <p>Máy chủ chưa bật thanh toán mô phỏng.</p>}</> : <><ResourceState {...resource} /><ErrorNotice error={error} />{resource.data && <div className="panel"><p>Số tiền mô phỏng: {money(resource.data.amount)}</p><p>Trạng thái từ máy chủ: {resource.data.status}</p><p>Hết hạn: {date(resource.data.expires_at)}</p>{resource.data.status === 'pending' && !unknown && <div className="actions"><button disabled={busy} onClick={() => complete('SUCCESS')}>Mô phỏng thanh toán thành công</button><button disabled={busy} onClick={() => complete('FAILED')}>Mô phỏng thanh toán thất bại</button></div>}{unknown && <p className="notice">Kết quả thao tác chưa xác nhận. Kiểm tra trạng thái đơn trước khi gửi tiếp.</p>}<Link className="text-link" to={`/payment/result?orderId=${resource.data.order_id}`}>Xác minh đơn từ máy chủ →</Link></div>}</>}</section>;
}
