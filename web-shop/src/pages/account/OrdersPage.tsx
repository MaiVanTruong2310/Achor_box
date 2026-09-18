import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { Order, ORDER_STATUS_LABELS } from '../../types/order';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Package, ArrowRight } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderApi.getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) {
    return <LoadingSpinner message="Đang tải danh sách đơn hàng..." />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Chưa có đơn hàng nào"
        description="Bạn chưa đặt mua thiết bị Anchor Box nào trên hệ thống."
        actionText="Xem danh mục sản phẩm"
        actionLink="/products"
        icon={<Package size={28} />}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
          Đơn hàng của tôi ({orders.length})
        </h2>
      </div>

      {orders.map((order) => {
        const statusMeta = ORDER_STATUS_LABELS[order.status] || {
          label: order.status,
          color: 'gray',
          description: ''
        };

        return (
          <div
            key={order.id}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>
                  {order.code}
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <Badge variant={statusMeta.color as any}>
                {statusMeta.label}
              </Badge>
            </div>

            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={item.image || '/products/smartbox-std-front.svg'} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số lượng: {item.quantity} &bull; SKU: {item.sku}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng thanh toán: </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatPrice(order.total)}
                </span>
              </div>

              <Link to={`/account/orders/${order.id}`} className="btn btn-secondary btn-sm">
                Chi tiết đơn hàng <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
};
