import { SalesInvoiceModal } from '../../components/SalesInvoiceModal';
import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { paymentApi, PAYMENT_LABELS, paymentLabel,redirectToPayment } from '../../api/paymentApi';
import { usePaymentMode } from '../../context/PaymentModeContext';
import { Order, ORDER_STATUS_LABELS, DELIVERY_LABELS } from '../../types/order';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Clock, MapPin, Truck } from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { mode } = usePaymentMode();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [invoiceOpen,setInvoiceOpen]=useState(false);
  const location = useLocation();
  const [error, setError] = useState((location.state as { error?: string } | null)?.error || '');

  useEffect(() => {
    if (!id) return;
    setLoading(true); setOrder(null);
    let active = true;
    const load = () => orderApi.getOrderById(id).then(data => { if (active) setOrder(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Đang tải chi tiết đơn hàng..." />;
  }

  if (!order) {
    return (
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
        {error && <p role="alert">{error}</p>}<h3 style={{ fontSize: '16px', fontWeight: 700 }}>Không tìm thấy đơn hàng</h3>
        <Link to="/account/orders" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
          Quay lại danh sách đơn
        </Link>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const statusMeta = ORDER_STATUS_LABELS[order.status] || {
    label: order.status,
    color: 'gray',
    description: ''
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    setCancelling(true);
    try {
      const updated = await orderApi.cancelOrder(order.id, 'Người dùng hủy đơn qua giao diện');
      setOrder(updated);
    } catch (err: any) {
      alert(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {error && <p className="form-error" role="alert">{error}</p>}
      {order.status === 'PENDING' && <button className="btn btn-primary" disabled={cancelling || !mode} onClick={async () => { setCancelling(true); setError(''); try { const checkout=await orderApi.checkout(order.id); if(!redirectToPayment(checkout))setOrder(await orderApi.getOrderById(order.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Không checkout được đơn.'); } finally { setCancelling(false); } }}>Tiếp tục checkout</button>}
      <div>{order.status === 'AWAITING_PAYMENT' && order.payment?.provider === 'vnpay' && order.payment.status === 'pending' && <button className="btn btn-primary" disabled={cancelling} onClick={async()=>{setCancelling(true);setError('');try{redirectToPayment(await paymentApi.session(order.id));}catch(e){setError((e as Error).message);}finally{setCancelling(false);}}}>Tiếp tục thanh toán VNPAY Sandbox</button>}</div><section><h3>Tiến độ giao và lắp đặt</h3>{order.deliveryInstallation ? <><p>{order.status === 'CANCELLED' ? 'Công việc đã đóng vì đơn bị hủy' : DELIVERY_LABELS[order.deliveryInstallation.status] || order.deliveryInstallation.status}</p>{['scheduledAt', 'startedAt', 'deliveredAt', 'installedAt', 'completedAt'].map(field => { const value = order.deliveryInstallation?.[field as 'scheduledAt']; return value ? <p key={field}>{{ scheduledAt: 'Lịch hẹn', startedAt: 'Nhận việc', deliveredAt: 'Đã giao', installedAt: 'Đã lắp đặt', completedAt: 'Nghiệm thu đạt' }[field]}: {new Date(value).toLocaleString('vi-VN')}</p> : null; })}</> : <p>Chưa có lịch giao và lắp đặt.</p>}</section>
      {order.payment && <section><h3>Giao dịch thanh toán</h3><p>{paymentLabel(order.payment)}</p><p>{PAYMENT_LABELS[order.payment.status] || order.payment.status}</p>{order.payment.expiresAt && <p>Hạn thanh toán: {new Date(order.payment.expiresAt).toLocaleString('vi-VN')}</p>}{order.payment.refund && <p>{order.payment.refund.status === 'COMPLETED' ? 'Đã ghi nhận đối soát hoàn tiền' : 'Đang chờ hoàn tiền'} · {Number(order.payment.refund.amount).toLocaleString('vi-VN')} đ {order.payment.isSimulated && '(giả lập)'}</p>}
        {mode?.demoActionsEnabled && order.payment.provider === 'mock' && order.payment.status === 'pending' && <div><p>Các nút sau chỉ tạo kết quả giả lập phục vụ demo.</p>{(['SUCCESS','FAILED'] as const).map(result => <button key={result} className="btn btn-secondary" disabled={cancelling} onClick={async () => { setCancelling(true); setError(''); try { await paymentApi.simulate(order.payment!.id,result); setOrder(await orderApi.getOrderById(order.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Không nhận được kết quả giả lập.'); try { setOrder(await orderApi.getOrderById(order.id)); } catch { /* Show unknown result; never fabricate success. */ } } finally { setCancelling(false); } }}>{result === 'SUCCESS' ? 'Giả lập thành công' : 'Giả lập thất bại'}</button>)}</div>}
        {order.payment.provider === 'mock' && !mode?.demoActionsEnabled && <p>Chưa bật thao tác demo trên máy chủ. Không chuyển tiền thật cho giao dịch này.</p>}
      </section>}
      {order.paymentStatus === 'PAID' && <button className="btn btn-secondary" onClick={()=>setInvoiceOpen(true)}>Xem / In hóa đơn bán hàng</button>}
      {invoiceOpen && <SalesInvoiceModal orderId={order.id} onClose={()=>setInvoiceOpen(false)}/>}
      {/* Back button */}
      <div>
        <Link
          to="/account/orders"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} /> Quay lại danh sách đơn hàng
        </Link>
      </div>

      {/* Main Order Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chi tiết đơn hàng</div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {order.code}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Badge variant={statusMeta.color as any} style={{ fontSize: '13px', padding: '6px 12px' }}>
              {statusMeta.label}
            </Badge>

            {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="btn btn-danger btn-sm"
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            )}
          </div>
        </div>

        {/* Shipping details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '13.5px' }} className="detail-two-col">
          <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} /> Địa chỉ nhận hàng
            </div>
            <div><strong>Người nhận:</strong> {order.shippingAddress.fullName}</div>
            <div><strong>Điện thoại:</strong> {order.shippingAddress.phone}</div>
            <div><strong>Địa chỉ:</strong> {order.shippingAddress.address}</div>
            {order.shippingAddress.note && (
              <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                Ghi chú: {order.shippingAddress.note}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={15} /> Hình thức thanh toán &amp; Vận chuyển
            </div>
            <div><strong>Phương thức:</strong> {order.payment?paymentLabel(order.payment):'Chưa thanh toán'}</div>
            <div><strong>Trạng thái:</strong> {order.payment ? (PAYMENT_LABELS[order.payment.status] || order.payment.status) : 'Chưa checkout'}</div>
            <div><strong>Vận chuyển:</strong> Giao hàng tiêu chuẩn toàn quốc (Miễn phí)</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
            Sản phẩm trong đơn
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={item.image || '/products/smartbox-std-front.svg'} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      SKU: {item.sku} &bull; Số lượng: {item.quantity} &bull; Đơn giá: {formatPrice(item.price)}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '15px' }}>
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
            <span style={{ fontWeight: 700 }}>Tổng tiền:</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        {/* Status Timeline History */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} /> Tiến trình xử lý đơn hàng
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(order.timeline || []).map((h, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  fontSize: '13px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {h.source === 'ORDER' ? ORDER_STATUS_LABELS[h.action.toUpperCase() as keyof typeof ORDER_STATUS_LABELS]?.label || h.action : ({ CREATED: 'PO Ticket được tạo', APPROVE: 'Đã phê duyệt PO Ticket', RETURN: 'Yêu cầu bổ sung thông tin', RESUBMIT: 'Đã gửi giải trình', REJECT: 'PO Ticket bị từ chối', ASSIGN: 'Đã phân công giao/lắp', START: 'Nhân viên đã nhận việc', DELIVER: 'Đã giao thiết bị', INSTALL: 'Đã lắp đặt', ACCEPT: 'Nghiệm thu đạt', FAIL: 'Cần điều chỉnh công việc', REASSIGN: 'Đã phân công lại', ORDER_CANCELLED: 'Công việc đóng vì hủy đơn' } as Record<string,string>)[h.action] || h.action}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{h.source === 'PO_TICKET' ? 'Phê duyệt đơn' : h.source === 'DELIVERY_INSTALLATION' ? 'Giao và lắp đặt' : 'Đơn hàng'}{h.attempt ? ` · Lần thực hiện ${h.attempt}` : ''}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {new Date(h.occurredAt).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .detail-two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
