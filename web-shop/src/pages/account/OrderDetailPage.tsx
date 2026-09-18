import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { Order, ORDER_STATUS_LABELS } from '../../types/order';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Clock, MapPin, Truck } from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    orderApi.getOrderById(id).then((data) => {
      setOrder(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Đang tải chi tiết đơn hàng..." />;
  }

  if (!order) {
    return (
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Không tìm thấy đơn hàng</h3>
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

            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
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
            <div><strong>Phương thức:</strong> {order.paymentMethod === 'COD' ? 'Thanh toán COD' : 'Chuyển khoản'}</div>
            <div><strong>Trạng thái:</strong> {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</div>
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
            {order.statusHistory.map((h, idx) => (
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
                    {ORDER_STATUS_LABELS[h.status]?.label || h.status}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{h.note}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {h.timestamp}
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
