import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { Order, ORDER_STATUS_LABELS } from '../types/order';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const OrderSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(
    (location.state as any)?.order || null
  );
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order && id) {
      orderApi.getOrderById(id).then((data) => {
        setOrder(data);
        setLoading(false);
      });
    }
  }, [id, order]);

  if (loading) {
    return <LoadingSpinner message="Đang tải thông tin xác nhận đơn hàng..." />;
  }

  if (!order) {
    return (
      <div className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Không tìm thấy đơn hàng</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Mã đơn hàng không hợp lệ hoặc đã bị hủy.
          </p>
          <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const statusInfo = ORDER_STATUS_LABELS[order.status] || {
    label: order.status,
    color: 'gray',
    description: ''
  };

  return (
    <div className="section" style={{ paddingTop: '32px' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Success Banner */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 28px',
            textAlign: 'center',
            marginBottom: '28px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            Đặt hàng thành công
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 20px' }}>
            Cảm ơn bạn đã lựa chọn Anchor Box. Chúng tôi sẽ chuẩn bị đơn hàng và liên hệ để giao hàng tới bạn trong thời gian sớm nhất.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--bg-surface-secondary)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mã đơn hàng:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
              #{order.code}
            </span>
          </div>
        </div>

        {/* Order Details & Shipping Info */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '28px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              Thông tin đơn hàng
            </h2>
            <Badge variant={statusInfo.color as any}>
              {statusInfo.label}
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '13.5px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Người nhận:</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{order.shippingAddress.fullName}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{order.shippingAddress.phone}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{order.shippingAddress.email}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Địa chỉ nhận hàng:</div>
              <div style={{ color: 'var(--text-main)', lineHeight: 1.4 }}>{order.shippingAddress.address}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                Phương thức: <strong>{order.payment?.isSimulated ? 'Giả lập — không thu tiền thật' : 'Xem thông tin giao dịch trên trang đơn hàng'}</strong>
              </div>
            </div>
          </div>

          {/* Purchased Items */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
              Sản phẩm đã đặt:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.quantity}x</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>Tổng tiền:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Next Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary btn-md">
            <Home size={15} /> Tiếp tục mua sắm
          </Link>
          <Link to="/account/orders" className="btn btn-primary btn-md">
            Xem đơn hàng của tôi <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
};
